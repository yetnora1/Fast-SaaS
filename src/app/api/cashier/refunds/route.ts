import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

const schema = z.object({ refundId: z.string().min(1) });

// Cashier executes a manager-approved refund (spec §5).
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const refund = await prisma.refund.findUnique({ where: { id: body.refundId } });
  if (!refund) return fail("Refund not found", 404);
  if (!refund.approvedBy) return fail("Refund not approved by manager", 403);

  await prisma.$transaction([
    prisma.refund.update({ where: { id: refund.id }, data: { executedBy: me.sub } }),
    prisma.order.update({ where: { id: refund.orderId }, data: { status: "REFUNDED" } }),
  ]);
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.refund.execute", entity: "refund", entityId: refund.id });
  return ok({ executed: true });
});
