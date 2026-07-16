import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { notifyRoleInBranch } from "@/lib/services/notifications";

// Waiter accepts a QR order → moves it to the cashier payment queue (pay-first flow, spec §4.4).
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) return fail("Order not found", 404);

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: params.id },
      data: { status: "AWAITING_PAYMENT", submittedAt: new Date(), waiterId: me.sub },
    });

    await tx.orderStateLog.create({
      data: {
        orderId: params.id,
        fromStatus: existing.status,
        toStatus: "AWAITING_PAYMENT",
        actor: me.sub,
        reason: "Waiter accepted QR order — awaiting cashier payment",
      },
    });

    if (updated.tableId) {
      await tx.cafeTable.update({ where: { id: updated.tableId }, data: { status: "occupied" } });
    }

    return updated;
  });

  await notifyRoleInBranch(order.branchId, "cashier", "order_awaiting_payment", "Order awaiting payment", "A QR order was accepted and is waiting for payment.");
  return ok({ confirmed: true });
});
