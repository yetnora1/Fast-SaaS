import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { toNum } from "@/lib/money";

const schema = z.object({ branchId: z.string().min(1) });

// Initiate a stock count → freeze current levels as the baseline (spec §8.4).
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const items = await tenantDb(me.tenantId).inventoryItem.findMany({ where: { branchId: body.branchId } });
  if (items.length === 0) return fail("No inventory in branch", 400);

  const count = await prisma.stockCount.create({
    data: {
      branchId: body.branchId,
      initiatedBy: me.sub,
      lines: { create: items.map((i) => ({ itemId: i.id, systemQty: toNum(i.quantity) })) },
    },
    include: { lines: true },
  });
  return ok(count);
});

export const GET = handler(async () => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const branches = await tenantDb(me.tenantId).branch.findMany({ select: { id: true } });
  const counts = await prisma.stockCount.findMany({
    where: { branchId: { in: branches.map((b) => b.id) } },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });
  return ok({ counts });
});
