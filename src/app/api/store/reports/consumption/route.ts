import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";

// Consumption + waste + valuation report (spec §8.5 / Owner inventory report).
export const GET = handler(async () => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const items = await tenantDb(me.tenantId).inventoryItem.findMany();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = [];
  let valuation = 0;
  for (const item of items) {
    const consumed = await prisma.stockMovement.aggregate({ where: { itemId: item.id, type: "CONSUME", createdAt: { gte: since } }, _sum: { quantity: true } });
    const wasted = await prisma.stockMovement.aggregate({ where: { itemId: item.id, type: "WASTE", createdAt: { gte: since } }, _sum: { quantity: true } });
    const received = await prisma.stockMovement.aggregate({ where: { itemId: item.id, type: "RECEIVE", createdAt: { gte: since } }, _sum: { quantity: true } });
    const value = round2(toNum(item.quantity) * toNum(item.costPerUnit));
    valuation += value;
    rows.push({
      id: item.id,
      name: item.name,
      unit: item.unit,
      received: toNum(received._sum.quantity ?? 0),
      consumed: toNum(consumed._sum.quantity ?? 0),
      wasted: toNum(wasted._sum.quantity ?? 0),
      onHand: toNum(item.quantity),
      value,
    });
  }
  return ok({ rows, valuation: round2(valuation) });
});
