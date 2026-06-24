import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { publish } from "@/lib/integrations/realtime";

// Confirm QR order → submit + fire to KDS (spec §4.4).
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), waiterId: me.sub },
    include: { items: true },
  });
  if (order.items.some((i) => i.station === "BARISTA")) publish(`kds:barista:${order.branchId}`, { orderId: order.id });
  if (order.items.some((i) => i.station === "KITCHEN")) publish(`kds:kitchen:${order.branchId}`, { orderId: order.id });
  return ok({ confirmed: true });
});
