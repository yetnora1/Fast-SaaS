import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { config } from "@/lib/config";
import { audit } from "@/lib/audit";
import { notifyTenantOwner } from "@/lib/services/notifications";

const schema = z.object({ note: z.string().optional() });

// Approve subscription receipt → activate for 180 days (spec §1.4).
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  const body = schema.parse(await req.json().catch(() => ({})));

  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub || sub.status !== "PENDING") return fail("No pending subscription", 404);

  const periodStart = new Date();
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + config.subscription.days);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "APPROVED", approvedBy: me.sub, reviewNote: body.note, periodStart, periodEnd },
    }),
    prisma.tenant.update({ where: { id: sub.tenantId }, data: { subStart: periodStart, subEnd: periodEnd } }),
  ]);

  await audit({ userId: me.sub, tenantId: sub.tenantId, action: "saas.billing.approve", entity: "subscription", entityId: sub.id, ip: clientIp(req) });
  await notifyTenantOwner(sub.tenantId, "subscription_approved", "Subscription approved", `Your subscription is active until ${periodEnd.toDateString()}.`);
  return ok({ periodEnd });
});
