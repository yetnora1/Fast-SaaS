import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

export const GET = handler(async () => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const suppliers = await tenantDb(me.tenantId).supplier.findMany({ orderBy: { name: "asc" } });
  return ok({ suppliers });
});

const schema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  paymentTerms: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const supplier = await tenantDb(me.tenantId).supplier.create({ data: { ...body, tenantId: me.tenantId } });
  return ok(supplier);
});
