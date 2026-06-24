import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

const schema = z.object({ days: z.number().int().min(1).max(14), reason: z.string().min(3) });

// Manually extend trial up to 14 days max, requires reason log (spec §1.3).
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  const body = schema.parse(await req.json());
  const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return fail("Not found", 404);

  const base = tenant.trialEnd && tenant.trialEnd > new Date() ? tenant.trialEnd : new Date();
  const trialEnd = new Date(base);
  trialEnd.setDate(trialEnd.getDate() + body.days);

  await prisma.tenant.update({ where: { id: params.id }, data: { trialEnd } });
  await audit({ userId: me.sub, tenantId: params.id, action: "saas.tenant.trial_extend", entity: "tenant", entityId: params.id, ip: clientIp(req), meta: { days: body.days, reason: body.reason } });
  return ok({ trialEnd });
});
