import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { setItemStatus } from "@/lib/services/orders";
import { notifyUser, notifyRoleInBranch } from "@/lib/services/notifications";
import { prisma } from "@/lib/db/client";
import type { OrderItemStatus } from "@prisma/client";

// Item-level KDS transitions: accept | reject | start | plate | ready | unavail
const MAP: Record<string, OrderItemStatus> = {
  accept: "ACCEPTED",
  start: "PREPARING",
  plate: "PLATING",
  ready: "READY",
};

export const PATCH = handler(async (_req: Request, { params }: { params: { id: string; action: string } }) => {
  await requireTenant("barista", "kitchen", "cafe_manager", "cafe_owner");

  if (params.action === "unavail") {
    const item = await prisma.orderItem.findUnique({ where: { id: params.id } });
    if (!item) return fail("Not found", 404);
    await prisma.menuItem.update({ where: { id: item.menuItemId }, data: { available: false } });
    return ok({ unavailable: true });
  }

  // Station rejects an item (out of stock, can't prepare). Pay-last flow: the
  // item is dropped from the bill automatically; the waiter is alerted to inform
  // the customer. The cashier is only involved if a payment was already taken
  // (refund/adjustment).
  if (params.action === "reject") {
    const item = await prisma.orderItem.findUnique({ where: { id: params.id }, include: { order: { include: { table: true } }, menuItem: true } });
    if (!item) return fail("Not found", 404);
    if (["DELIVERED", "VOIDED", "REJECTED"].includes(item.status)) return fail(`Item is already ${item.status}`, 409);

    const orderId = await setItemStatus(params.id, "REJECTED");

    const tableNo = item.order.table?.number ?? item.order.guestTableNumber;
    const tableRef = tableNo != null ? `table ${tableNo}` : "a takeaway order";
    if (item.order.waiterId) {
      await notifyUser(item.order.waiterId, "item_rejected", "Item rejected", `"${item.menuItem.name}" for ${tableRef} was rejected by the station — inform the customer. It was removed from the bill.`);
    }
    const paid = await prisma.payment.findFirst({ where: { orderId, status: "CONFIRMED" } });
    if (paid) {
      await notifyRoleInBranch(item.order.branchId, "cashier", "item_rejected", "Item rejected", `"${item.menuItem.name}" for ${tableRef} was rejected after payment — adjust or refund.`);
    }
    return ok({ orderId, status: "REJECTED" });
  }

  const status = MAP[params.action];
  if (!status) return fail("Unknown action", 400);

  // Per-item ready → tell the waiter so drinks go out while food is still cooking.
  // When the whole order turns READY, recomputeOrderStatus sends the order-level
  // notification instead, so skip the item-level one to avoid a double ping.
  if (status === "READY") {
    const item = await prisma.orderItem.findUnique({ where: { id: params.id }, include: { order: { include: { table: true } }, menuItem: true } });
    if (!item) return fail("Not found", 404);
    const orderId = await setItemStatus(params.id, status);
    const after = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (after?.status !== "READY" && item.order.waiterId) {
      const tableNo = item.order.table?.number ?? item.order.guestTableNumber;
      const tableRef = tableNo != null ? `table ${tableNo}` : "a takeaway order";
      await notifyUser(item.order.waiterId, "item_ready", "Item ready", `"${item.menuItem.name}" for ${tableRef} is ready for delivery.`);
    }
    return ok({ orderId, status });
  }

  const orderId = await setItemStatus(params.id, status);
  return ok({ orderId, status });
});
