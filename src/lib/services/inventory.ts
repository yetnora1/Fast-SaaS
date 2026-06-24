import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import type { StockMovementType } from "@prisma/client";

export type StockStatus = "OK" | "LOW" | "CRITICAL";

export function stockStatus(quantity: number, min: number): StockStatus {
  if (quantity <= min) return "CRITICAL";
  if (quantity <= min * 1.5) return "LOW";
  return "OK";
}

export async function applyMovement(opts: {
  itemId: string;
  type: StockMovementType;
  quantity: number; // positive magnitude
  reason?: string;
  userId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: opts.itemId } });
    if (!item) throw new Error("Inventory item not found");

    const delta = opts.type === "RECEIVE" ? opts.quantity : -Math.abs(opts.quantity);
    const newQty = round2(toNum(item.quantity) + delta);

    const updated = await tx.inventoryItem.update({
      where: { id: opts.itemId },
      data: { quantity: newQty },
    });
    await tx.stockMovement.create({
      data: { itemId: opts.itemId, type: opts.type, quantity: opts.quantity, reason: opts.reason, userId: opts.userId },
    });
    return { item: updated, before: toNum(item.quantity), after: newQty, min: toNum(item.minThreshold) };
  });
}

/** Receiving stock may resolve a critical alert → notify manager + KDS. */
export async function receiveStock(opts: { itemId: string; quantity: number; reason?: string; userId?: string }) {
  const res = await applyMovement({ ...opts, type: "RECEIVE" });
  const wasCritical = res.before <= res.min;
  const nowOk = res.after > res.min;
  if (wasCritical && nowOk) {
    await notifyRoleInBranch(res.item.branchId, "cafe_manager", "stock_resolved", "Stock restocked", `${res.item.name} is back above threshold.`);
    await notifyRoleInBranch(res.item.branchId, "barista", "stock_resolved", "Ingredient available", `${res.item.name} restocked.`);
    await notifyRoleInBranch(res.item.branchId, "kitchen", "stock_resolved", "Ingredient available", `${res.item.name} restocked.`);
  }
  return res;
}

/** compute_stock_forecast() equivalent — hours to stockout from 7-day avg usage. */
export async function stockForecast(tenantId: string) {
  const items = await prisma.inventoryItem.findMany({ where: { tenantId }, include: { branch: true } });
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const results = [];
  for (const item of items) {
    const consumed = await prisma.stockMovement.aggregate({
      where: { itemId: item.id, type: "CONSUME", createdAt: { gte: since } },
      _sum: { quantity: true },
    });
    const totalConsumed = toNum(consumed._sum.quantity ?? 0);
    const avgDaily = totalConsumed / 7;
    const qty = toNum(item.quantity);
    const hoursToStockout = avgDaily > 0 ? round2((qty / avgDaily) * 24) : null;
    results.push({
      id: item.id,
      name: item.name,
      quantity: qty,
      unit: item.unit,
      minThreshold: toNum(item.minThreshold),
      status: stockStatus(qty, toNum(item.minThreshold)),
      avgDaily: round2(avgDaily),
      hoursToStockout,
    });
  }
  return results;
}

export async function lowStockAlerts(tenantId: string, branchId?: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId, ...(branchId ? { branchId } : {}) },
  });
  return items
    .map((i) => ({ ...i, quantity: toNum(i.quantity), minThreshold: toNum(i.minThreshold), status: stockStatus(toNum(i.quantity), toNum(i.minThreshold)) }))
    .filter((i) => i.status !== "OK");
}
