import { z } from "zod";
import { handler, ok, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

export const GET = handler(async () => {
  await requireRole("saas_owner");
  const rows = await prisma.platformConfig.findMany();
  const config: Record<string, string> = {};
  for (const r of rows) config[r.key] = r.value;
  return ok(config);
});

const schema = z.record(z.string());

export const PUT = handler(async (req: Request) => {
  const me = await requireRole("saas_owner");
  const body = schema.parse(await req.json());
  for (const [key, value] of Object.entries(body)) {
    await prisma.platformConfig.upsert({ where: { key }, update: { value, updatedBy: me.sub }, create: { key, value, updatedBy: me.sub } });
  }
  await audit({ userId: me.sub, action: "saas.config.update", ip: clientIp(req), meta: { keys: Object.keys(body) } });
  return ok({ updated: Object.keys(body).length });
});
