import { handler, ok, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  await prisma.tenant.update({ where: { id: params.id }, data: { status: "suspended" } });
  await audit({ userId: me.sub, tenantId: params.id, action: "saas.tenant.suspend", entity: "tenant", entityId: params.id, ip: clientIp(req) });
  return ok({ suspended: true });
});
