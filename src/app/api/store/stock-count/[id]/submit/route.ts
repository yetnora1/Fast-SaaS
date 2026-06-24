import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { applyMovement } from "@/lib/services/inventory";
import { toNum, round2 } from "@/lib/money";
import { audit } from "@/lib/audit";

const schema = z.object({
  lines: z.array(z.object({ lineId: z.string().min(1), countedQty: z.number(), reason: z.string().optional() })).min(1),
});

// Submit counted quantities → compute variances → apply adjustments (spec §8.4).
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const count = await prisma.stockCount.findUnique({ where: { id: params.id }, include: { lines: true } });
  if (!count) return fail("Count not found", 404);

  const adjustments: { itemId: string; delta: number }[] = [];
  for (const input of body.lines) {
    const line = count.lines.find((l) => l.id === input.lineId);
    if (!line) continue;
    const variance = round2(input.countedQty - toNum(line.systemQty));
    await prisma.stockCountLine.update({ where: { id: line.id }, data: { countedQty: input.countedQty, variance, reason: input.reason } });
    if (variance !== 0) adjustments.push({ itemId: line.itemId, delta: variance });
  }

  for (const adj of adjustments) {
    await applyMovement({ itemId: adj.itemId, type: adj.delta >= 0 ? "RECEIVE" : "ADJUST", quantity: Math.abs(adj.delta), reason: "stock count adjustment", userId: me.sub });
  }
  await prisma.stockCount.update({ where: { id: count.id }, data: { status: "CLOSED" } });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "store.stock_count.submit", entity: "stock_count", entityId: count.id, meta: { adjustments: adjustments.length } });
  return ok({ adjusted: adjustments.length });
});
