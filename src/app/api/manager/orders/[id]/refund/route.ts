import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

const schema = z.object({ amount: z.number().positive(), reason: z.string().min(2) });

// Manager approves refund; cashier executes (spec §3.3 / §5).
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const refund = await prisma.refund.create({ data: { orderId: params.id, amount: body.amount, reason: body.reason, approvedBy: me.sub } });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "manager.order.refund_approve", entity: "refund", entityId: refund.id });
  return ok(refund);
});
