import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { setItemStatus } from "@/lib/services/orders";
import { prisma } from "@/lib/db/client";
import type { OrderItemStatus } from "@prisma/client";

// Item-level KDS transitions: start | plate | ready | unavail
const MAP: Record<string, OrderItemStatus> = {
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

  const status = MAP[params.action];
  if (!status) return fail("Unknown action", 400);
  const orderId = await setItemStatus(params.id, status);
  return ok({ orderId, status });
});
