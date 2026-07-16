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

  // Station rejects an item (out of stock, can't prepare). The order was already
  // paid at the cashier, so both the waiter and the cashier are alerted; the
  // cashier settles the difference (refund/replacement).
  if (params.action === "reject") {
    const item = await prisma.orderItem.findUnique({ where: { id: params.id }, include: { order: true, menuItem: true } });
    if (!item) return fail("Not found", 404);
    if (["DELIVERED", "VOIDED", "REJECTED"].includes(item.status)) return fail(`Item is already ${item.status}`, 409);

    const orderId = await setItemStatus(params.id, "REJECTED");

    if (item.order.waiterId) {
      await notifyUser(item.order.waiterId, "item_rejected", "Item rejected", `"${item.menuItem.name}" was rejected by the station — inform the customer.`);
    }
    await notifyRoleInBranch(item.order.branchId, "cashier", "item_rejected", "Item rejected", `"${item.menuItem.name}" was rejected after payment — adjust or refund.`);
    return ok({ orderId, status: "REJECTED" });
  }

  const status = MAP[params.action];
  if (!status) return fail("Unknown action", 400);
  const orderId = await setItemStatus(params.id, status);
  return ok({ orderId, status });
});
