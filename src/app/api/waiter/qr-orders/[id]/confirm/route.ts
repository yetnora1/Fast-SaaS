import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// Waiter accepts a QR order → fires it to the kitchen/barista stations (pay-last flow, spec §4.4).
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) return fail("Order not found", 404);

  // The customer requested a specific waiter — only that waiter may accept it.
  // (Managers/owners can still confirm on their behalf.)
  if (me.role === "waiter" && existing.waiterId && existing.waiterId !== me.sub) {
    return fail("This order was assigned to another waiter", 403);
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: params.id },
      // Keep the waiter the customer specifically requested; only claim the order
      // for the confirming waiter when the customer didn't pick anyone.
      data: { status: "CONFIRMED", submittedAt: new Date(), waiterId: existing.waiterId ?? me.sub },
    });

    await tx.orderStateLog.create({
      data: {
        orderId: params.id,
        fromStatus: existing.status,
        toStatus: "CONFIRMED",
        actor: me.sub,
        reason: "Waiter accepted QR order — fired to kitchen/barista",
      },
    });

    if (updated.tableId) {
      await tx.cafeTable.update({ where: { id: updated.tableId }, data: { status: "occupied" } });
    }

    return updated;
  });

  return ok({ confirmed: true });
});
