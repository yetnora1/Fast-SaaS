import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

const schema = z.object({ name: z.string().min(1), nameAm: z.string().optional(), sortOrder: z.number().int().optional() });

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const body = schema.parse(await req.json());
  const cat = await tenantDb(me.tenantId).menuCategory.create({ data: { tenantId: me.tenantId, name: body.name, nameAm: body.nameAm, sortOrder: body.sortOrder ?? 0 } });
  return ok(cat);
});
