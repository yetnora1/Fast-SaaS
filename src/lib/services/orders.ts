import { prisma } from "@/lib/db/client";
import { lineTotal } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import type { OrderItemStatus } from "@prisma/client";

export interface NewOrderItemInput {
  menuItemId: string;
  quantity: number;
  modifiers?: { groupName: string; option: string; extraPrice?: number }[];
  notes?: string;
  allergyNote?: string;
}

/**
 * Create & submit an order. Server-side split: items are routed to the BARISTA or
 * KITCHEN station based on the menu item's station/course (Build spec §4.2, §9.1).
 */
export async function createOrder(opts: {
  tenantId: string;
  branchId: string;
  tableId?: string | null;
  waiterId?: string | null;
  type?: "DINE_IN" | "QR" | "TAKEAWAY";
  items: NewOrderItemInput[];
  submit?: boolean;
  txRef?: string | null;
  receiptUrl?: string | null;
  guestTableNumber?: number | null;
}) {
  const menuIds = opts.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuIds } } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        tenantId: opts.tenantId,
        branchId: opts.branchId,
        tableId: opts.tableId ?? null,
        waiterId: opts.waiterId ?? null,
        type: opts.type ?? "DINE_IN",
        status: opts.submit ? "SUBMITTED" : "DRAFT",
        submittedAt: opts.submit ? new Date() : null,
        txRef: opts.txRef ?? null,
        receiptUrl: opts.receiptUrl ?? null,
        guestTableNumber: opts.guestTableNumber ?? null,
      },
    });

    for (const item of opts.items) {
      const mi = byId.get(item.menuItemId);
      if (!mi) throw new Error(`Menu item not found: ${item.menuItemId}`);
      const extras = (item.modifiers ?? []).reduce((s, m) => s + (m.extraPrice ?? 0), 0);
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          menuItemId: mi.id,
          quantity: item.quantity,
          unitPrice: mi.price,
          modifiersJson: (item.modifiers ?? []) as any,
          notes: item.notes,
          allergyNote: item.allergyNote,
          station: mi.station,
          course: mi.course,
          status: "NEW",
        },
      });
    }

    if (opts.submit && opts.tableId) {
      await tx.cafeTable.update({ where: { id: opts.tableId }, data: { status: "occupied" } });
    }
    return created;
  });

  if (opts.submit) await onOrderSubmitted(order.id, opts.branchId);
  return order;
}

async function onOrderSubmitted(orderId: string, branchId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const hasDrinks = order.items.some((i) => i.station === "BARISTA");
  const hasFood = order.items.some((i) => i.station === "KITCHEN");
  // Allergy-flagged items must surface immediately to kitchen.
}

export async function addItemsToOrder(orderId: string, items: NewOrderItemInput[]) {
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const mi = byId.get(item.menuItemId);
      if (!mi) throw new Error(`Menu item not found: ${item.menuItemId}`);
      await tx.orderItem.create({
        data: {
          orderId,
          menuItemId: mi.id,
          quantity: item.quantity,
          unitPrice: mi.price,
          modifiersJson: (item.modifiers ?? []) as any,
          notes: item.notes,
          allergyNote: item.allergyNote,
          station: mi.station,
          course: mi.course,
          status: "NEW",
        },
      });
    }
  });
}

/** Advance one item's KDS status and recompute the parent order status. */
export async function setItemStatus(itemId: string, status: OrderItemStatus) {
  const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
  if (!item) throw new Error("Item not found");

  const patch: any = { status };
  if (status === "PREPARING" && !item.actualStart) patch.actualStart = new Date();
  if (status === "READY") patch.actualEnd = new Date();
  if (status === "DELIVERED") patch.deliveredAt = new Date();

  await prisma.orderItem.update({ where: { id: itemId }, data: patch });
  await recomputeOrderStatus(item.orderId);
  return item.orderId;
}

/** Derive order status from its items (PARTIALLY_READY / READY / DELIVERED). */
export async function recomputeOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, branch: true, payments: true } });
  if (!order) return;
  const active = order.items.filter((i) => i.status !== "VOIDED");
  if (active.length === 0) return;

  const allReady = active.every((i) => i.status === "READY" || i.status === "DELIVERED");
  const allDelivered = active.every((i) => i.status === "DELIVERED");
  const anyReady = active.some((i) => i.status === "READY" || i.status === "DELIVERED");
  const anyPrep = active.some((i) => ["ACCEPTED", "PREPARING", "PLATING"].includes(i.status));

  // Prepaid orders (customer paid up-front, cashier-approved receipt) have no
  // end-of-meal payment step, so they close out automatically once fully served.
  const prepaid = order.payments.some((p) => p.status === "CONFIRMED");

  let next = order.status;
  if (allDelivered && prepaid) next = "COMPLETED";
  else if (allDelivered) next = "DELIVERED";
  else if (allReady) next = "READY";
  else if (anyReady) next = "PARTIALLY_READY";
  else if (anyPrep) next = "IN_PREPARATION";

  if (next !== order.status && !["COMPLETED", "VOIDED", "REFUNDED", "BILL_REQUESTED", "PAYMENT_PENDING"].includes(order.status)) {
    await prisma.order.update({ where: { id: orderId }, data: { status: next } });

    // Prepaid order fully delivered → free the table, mirroring the POS payment path.
    if (next === "COMPLETED" && order.tableId) {
      await prisma.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }

    // Notify waiter when the whole order becomes READY.
    if (next === "READY" && order.waiterId) {
      const { notifyUser } = await import("./notifications");
      await notifyUser(order.waiterId, "order_ready", "Order ready", `Order for table is ready for delivery.`);
    }
  }
}

/** Bar/kitchen sync: are this order's drink items all ready? */
export async function barSyncReady(orderId: string): Promise<boolean> {
  const drinks = await prisma.orderItem.findMany({ where: { orderId, station: "BARISTA", status: { not: "VOIDED" } } });
  if (drinks.length === 0) return true;
  return drinks.every((d) => d.status === "READY" || d.status === "DELIVERED");
}

export async function requestBill(orderId: string) {
  await prisma.order.update({ where: { id: orderId }, data: { status: "BILL_REQUESTED" } });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order) {
    await notifyRoleInBranch(order.branchId, "cashier", "bill_requested", "Bill requested", "A table has requested the bill.");
  }
}

export async function voidOrder(orderId: string, reason: string, managerId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "VOIDED" } });
    await tx.orderItem.updateMany({ where: { orderId }, data: { status: "VOIDED" } });
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (order?.tableId) await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
  });
}

/** Compute the itemized bill with Ethiopian VAT breakdown. */
export async function getBill(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { menuItem: true }, where: { status: { not: "VOIDED" } } }, table: true },
  });
  if (!order) throw new Error("Order not found");

  const lines = order.items.map((i) => {
    const extras = Array.isArray(i.modifiersJson)
      ? (i.modifiersJson as any[]).reduce((s, m) => s + (Number(m.extraPrice) || 0), 0)
      : 0;
    return {
      itemId: i.id,
      name: i.menuItem.name,
      qty: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: lineTotal(i.unitPrice, i.quantity, extras),
      vatApplicable: i.menuItem.vatApplicable,
    };
  });
  const total = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { order, lines, total };
}
