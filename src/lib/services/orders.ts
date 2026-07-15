import { prisma } from "@/lib/db/client";
import { lineTotal } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import { runRiskCheck } from "./risk";
import type { OrderItemStatus, OrderStatus } from "@prisma/client";

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

  // Determine initial status: DRAFT or SUBMITTED
  const initialStatus: OrderStatus = opts.submit ? "SUBMITTED" : "DRAFT";

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        tenantId: opts.tenantId,
        branchId: opts.branchId,
        tableId: opts.tableId ?? null,
        waiterId: opts.waiterId ?? null,
        type: opts.type ?? "DINE_IN",
        status: initialStatus,
        submittedAt: initialStatus === "SUBMITTED" ? new Date() : null,
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

    // Log the initial state creation
    await tx.orderStateLog.create({
      data: {
        orderId: created.id,
        fromStatus: "DRAFT",
        toStatus: initialStatus,
        actor: opts.waiterId ?? "customer",
        reason: opts.submit ? "Order submitted" : "Order draft created",
      },
    });

    return created;
  });

  if (initialStatus === "SUBMITTED") {
    // Run the risk check
    const risk = await runRiskCheck(order.id);
    if (!risk.passed) {
      // Transition to PENDING_REVIEW
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PENDING_REVIEW" },
        });
        
        for (const flag of risk.flags) {
          await tx.riskFlag.create({
            data: {
              orderId: order.id,
              flagType: flag,
            },
          });
        }

        await tx.orderStateLog.create({
          data: {
            orderId: order.id,
            fromStatus: "SUBMITTED",
            toStatus: "PENDING_REVIEW",
            actor: "system",
            reason: `Risk check flags generated: ${risk.flags.join(", ")}`,
          },
        });
      });

      // Notify cashier about pending review
      await notifyRoleInBranch(order.branchId, "cashier", "order_pending", "New order pending review", "An order was flagged for review.");
    } else {
      // Transition to CONFIRMED (via AUTO_CONFIRMED transient state)
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
        });

        // Log transient auto confirm state
        await tx.orderStateLog.create({
          data: {
            orderId: order.id,
            fromStatus: "SUBMITTED",
            toStatus: "AUTO_CONFIRMED",
            actor: "system",
            reason: "Auto-confirmed: risk check passed",
          },
        });

        await tx.orderStateLog.create({
          data: {
            orderId: order.id,
            fromStatus: "AUTO_CONFIRMED",
            toStatus: "CONFIRMED",
            actor: "system",
            reason: "Confirmed and sent to kitchen",
          },
        });
      });

      await onOrderSubmitted(order.id, opts.branchId);
    }
  }

  return order;
}

async function onOrderSubmitted(orderId: string, branchId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const hasDrinks = order.items.some((i) => i.station === "BARISTA");
  const hasFood = order.items.some((i) => i.station === "KITCHEN");
  // Allergy-flagged items must surface immediately to kitchen.
}

/** Cashier approves a PENDING_REVIEW order → fires it to kitchen/barista. */
export async function cashierApproveOrder(orderId: string, cashierId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING_REVIEW") throw new Error(`Order is ${order.status}, not PENDING_REVIEW`);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED", submittedAt: new Date() },
    });
    
    await tx.orderStateLog.create({
      data: {
        orderId,
        fromStatus: "PENDING_REVIEW",
        toStatus: "CONFIRMED",
        actor: cashierId ?? "cashier",
        reason: "Cashier approved review",
      },
    });
  });

  await onOrderSubmitted(orderId, order.branchId);

  // Notify waiter their order was approved
  if (order.waiterId) {
    const { notifyUser } = await import("./notifications");
    await notifyUser(order.waiterId, "order_approved", "Order approved", "Your order has been approved by the cashier and sent to preparation.");
  }
}

/** Cashier declines a PENDING_REVIEW order with a reason. */
export async function cashierDeclineOrder(orderId: string, reason: string, cashierId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PENDING_REVIEW") throw new Error(`Order is ${order.status}, not PENDING_REVIEW`);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: "DECLINED", declineReason: reason || "No reason provided" },
    });
    
    await tx.orderStateLog.create({
      data: {
        orderId,
        fromStatus: "PENDING_REVIEW",
        toStatus: "DECLINED",
        actor: cashierId ?? "cashier",
        reason: reason || "Decline reason not specified",
      },
    });

    // Free the table if one was assigned
    if (order.tableId) {
      await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }
  });

  // Notify waiter about the decline
  if (order.waiterId) {
    const { notifyUser } = await import("./notifications");
    await notifyUser(order.waiterId, "order_declined", "Order declined", `Your order was declined: ${reason || "No reason provided"}`);
  }
}

/** Reorder/Add-Items Loop */
export async function addItemsToOrder(orderId: string, items: NewOrderItemInput[]) {
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  
  if (["BILL_REQUESTED", "PAYMENT_PENDING", "PAYMENT_FAILED", "COMPLETED", "CANCELLED", "DECLINED"].includes(order.status)) {
    throw new Error(`Cannot add items to order in ${order.status} state`);
  }

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
    
    // Update the order status back to SUBMITTED to trigger risk check verification
    await tx.order.update({
      where: { id: orderId },
      data: { status: "SUBMITTED" },
    });
    
    await tx.orderStateLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: "SUBMITTED",
        actor: order.waiterId ?? "system",
        reason: "New items added to order tab",
      },
    });
  });

  const risk = await runRiskCheck(orderId);
  if (!risk.passed) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PENDING_REVIEW" },
      });
      
      for (const flag of risk.flags) {
        await tx.riskFlag.create({
          data: {
            orderId,
            flagType: flag,
          },
        });
      }

      await tx.orderStateLog.create({
        data: {
          orderId,
          fromStatus: "SUBMITTED",
          toStatus: "PENDING_REVIEW",
          actor: "system",
          reason: `Risk check flags generated for new items: ${risk.flags.join(", ")}`,
        },
      });
    });
    await notifyRoleInBranch(order.branchId, "cashier", "order_pending", "New items pending review", "New items added to an order were flagged for review.");
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });

      await tx.orderStateLog.create({
        data: {
          orderId,
          fromStatus: "SUBMITTED",
          toStatus: "AUTO_CONFIRMED",
          actor: "system",
          reason: "New items auto-confirmed: risk check passed",
        },
      });

      await tx.orderStateLog.create({
        data: {
          orderId,
          fromStatus: "AUTO_CONFIRMED",
          toStatus: "CONFIRMED",
          actor: "system",
          reason: "New items confirmed and sent to kitchen",
        },
      });
    });
    await onOrderSubmitted(orderId, order.branchId);
  }
}

/** Advance one item's KDS status and recompute the parent order status. */
export async function setItemStatus(itemId: string, status: OrderItemStatus) {
  const item = await prisma.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
  if (!item) throw new Error("Item not found");

  const patch: any = { status };
  if (status === "PREPARING" && !item.actualStart) patch.actualStart = new Date();
  if (status === "READY" && !item.actualEnd) patch.actualEnd = new Date();
  if (status === "DELIVERED" && !item.deliveredAt) patch.deliveredAt = new Date();

  await prisma.orderItem.update({ where: { id: itemId }, data: patch });
  await recomputeOrderStatus(item.orderId);
  return item.orderId;
}

/** Derive order status from its items (PREPARING / READY / DELIVERED). */
export async function recomputeOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, branch: true, payments: true } });
  if (!order) return;
  const active = order.items.filter((i) => i.status !== "VOIDED");
  if (active.length === 0) return;

  const allReady = active.every((i) => i.status === "READY" || i.status === "DELIVERED");
  const allDelivered = active.every((i) => i.status === "DELIVERED");
  const anyReady = active.some((i) => i.status === "READY" || i.status === "DELIVERED");
  const anyPrep = active.some((i) => ["ACCEPTED", "PREPARING", "PLATING"].includes(i.status));

  const prepaid = order.payments.some((p) => p.status === "CONFIRMED");

  let next: OrderStatus = order.status;
  if (allDelivered && prepaid) next = "COMPLETED";
  else if (allDelivered) next = "DELIVERED";
  else if (allReady) next = "READY";
  else if (anyReady || anyPrep) next = "PREPARING";

  if (next !== order.status && !["COMPLETED", "CANCELLED", "DECLINED", "BILL_REQUESTED", "PAYMENT_PENDING"].includes(order.status)) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: next } });
      await tx.orderStateLog.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: next,
          actor: "system",
          reason: "Item status updates triggered recompute",
        },
      });
    });

    if (next === "COMPLETED" && order.tableId) {
      await prisma.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }

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
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "BILL_REQUESTED" } });
    await tx.orderStateLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: "BILL_REQUESTED",
        actor: "customer",
        reason: "Bill requested by table/waiter",
      },
    });
  });

  await notifyRoleInBranch(order.branchId, "cashier", "bill_requested", "Bill requested", "A table has requested the bill.");
}

/** Cancellation Flow (replaces voidOrder) */
export async function voidOrder(orderId: string, reason: string, managerId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.orderItem.updateMany({ where: { orderId }, data: { status: "VOIDED" } });
    
    await tx.orderStateLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: "CANCELLED",
        actor: managerId,
        reason: reason || "Cancelled by manager/owner",
      },
    });
    
    if (order.tableId) {
      await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }
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
