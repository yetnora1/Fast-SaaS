import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { stockStatus } from "@/lib/services/inventory";
import { toNum } from "@/lib/money";

export const GET = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? undefined;
  const items = await tenantDb(me.tenantId).inventoryItem.findMany({
    where: branchId ? { branchId } : {},
    include: { supplier: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return ok({
    items: items.map((i) => ({
      ...i,
      quantity: toNum(i.quantity),
      minThreshold: toNum(i.minThreshold),
      costPerUnit: toNum(i.costPerUnit),
      status: stockStatus(toNum(i.quantity), toNum(i.minThreshold)),
    })),
  });
});

const schema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().default("unit"),
  quantity: z.number().nonnegative().default(0),
  minThreshold: z.number().nonnegative().default(0),
  costPerUnit: z.number().nonnegative().default(0),
  supplierId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const item = await tenantDb(me.tenantId).inventoryItem.create({ data: { ...body, tenantId: me.tenantId } });
  return ok(item);
});
