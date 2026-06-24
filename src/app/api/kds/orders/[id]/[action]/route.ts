import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { barSyncReady, recomputeOrderStatus } from "@/lib/services/orders";
import { notifyUser } from "@/lib/services/notifications";

// Order-level KDS actions: accept | ready | hold | ack-allergy | sync-status
export const PATCH = handler(async (_req: Request, { params }: { params: { id: string; action: string } }) => {
  await requireTenant("barista", "kitchen", "cafe_manager", "cafe_owner");
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!order) return fail("Order not found", 404);

  switch (params.action) {
    case "accept": {
      await prisma.orderItem.updateMany({ where: { orderId: order.id, status: "NEW" }, data: { status: "ACCEPTED" } });
      await recomputeOrderStatus(order.id);
      return ok({ accepted: true });
    }
    case "hold": {
      await prisma.order.update({ where: { id: order.id }, data: { heldForBar: true } });
      return ok({ held: true });
    }
    case "ack-allergy": {
      await prisma.order.update({ where: { id: order.id }, data: { allergyAck: true } });
      return ok({ acknowledged: true });
    }
    case "ready": {
      // Kitchen "order ready" coordinates with the bar (spec §7.2).
      const drinksReady = await barSyncReady(order.id);
      if (!drinksReady) {
        await prisma.order.update({ where: { id: order.id }, data: { heldForBar: true } });
        return ok({ held: true, reason: "Bar not ready" });
      }
      await prisma.orderItem.updateMany({
        where: { orderId: order.id, status: { notIn: ["DELIVERED", "VOIDED"] } },
        data: { status: "READY" },
      });
      await prisma.order.update({ where: { id: order.id }, data: { status: "READY", heldForBar: false } });
      if (order.waiterId) await notifyUser(order.waiterId, "order_ready", "Order ready", "Full order is ready for delivery.");
      return ok({ ready: true });
    }
    default:
      return fail("Unknown action", 400);
  }
});

export const GET = handler(async (_req: Request, { params }: { params: { id: string; action: string } }) => {
  await requireTenant("barista", "kitchen", "cafe_manager", "cafe_owner");
  if (params.action !== "sync-status") return fail("Unknown action", 400);
  const ready = await barSyncReady(params.id);
  return ok({ barReady: ready });
});
