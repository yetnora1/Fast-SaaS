import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const branches = await tenantDb(me.tenantId).branch.findMany({ include: { _count: { select: { tables: true, users: true } } } });
  return ok({ branches });
});

const schema = z.object({ name: z.string().min(1), address: z.string().optional(), phone: z.string().optional() });

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const body = schema.parse(await req.json());
  const branch = await tenantDb(me.tenantId).branch.create({ data: { ...body, tenantId: me.tenantId } });
  return ok(branch);
});
