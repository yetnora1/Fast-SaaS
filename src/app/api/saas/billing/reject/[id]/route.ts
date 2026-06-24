import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";
import { notifyTenantOwner } from "@/lib/services/notifications";

const schema = z.object({ reason: z.string().min(3) });

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  const body = schema.parse(await req.json());
  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub || sub.status !== "PENDING") return fail("No pending subscription", 404);

  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "REJECTED", approvedBy: me.sub, rejectReason: body.reason } });
  await audit({ userId: me.sub, tenantId: sub.tenantId, action: "saas.billing.reject", entity: "subscription", entityId: sub.id, ip: clientIp(req), meta: { reason: body.reason } });
  await notifyTenantOwner(sub.tenantId, "subscription_rejected", "Receipt rejected", `Reason: ${body.reason}. Please re-upload.`);
  return ok({ rejected: true });
});
