import { handler, ok, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

// Soft delete — data retained 90 days (spec §1.3).
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  await prisma.tenant.update({ where: { id: params.id }, data: { status: "terminated" } });
  await audit({ userId: me.sub, tenantId: params.id, action: "saas.tenant.terminate", entity: "tenant", entityId: params.id, ip: clientIp(req) });
  return ok({ terminated: true });
});
