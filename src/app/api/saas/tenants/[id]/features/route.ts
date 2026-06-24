import { z } from "zod";
import { handler, ok, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

const schema = z.object({ key: z.string().min(2), enabled: z.boolean() });

export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  const body = schema.parse(await req.json());
  const feature = await prisma.tenantFeature.upsert({
    where: { tenantId_key: { tenantId: params.id, key: body.key } },
    update: { enabled: body.enabled },
    create: { tenantId: params.id, key: body.key, enabled: body.enabled },
  });
  await audit({ userId: me.sub, tenantId: params.id, action: "saas.tenant.feature", entity: "tenant_feature", entityId: feature.id, ip: clientIp(req), meta: body });
  return ok(feature);
});
