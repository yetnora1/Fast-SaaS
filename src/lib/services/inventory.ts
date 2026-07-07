import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import type { StockMovementType, GoodsDestination } from "@prisma/client";

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

/**
 * Store → station goods issue (double-entry leg 1).
 * Atomically: validates stock, decrements the store quantity, writes a TRANSFER
 * stock movement, and creates a permanent GoodsIssue ledger row (item name and
 * unit snapshotted). The destination station is then notified to receive it.
 */
export async function issueGoods(opts: {
  tenantId: string;
  itemId: string;
  quantity: number;
  destination: GoodsDestination;
  note?: string;
  userId: string;
}) {
  const issue = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({ where: { id: opts.itemId, tenantId: opts.tenantId } });
    if (!item) throw new Error("Inventory item not found");
    const onHand = toNum(item.quantity);
    if (opts.quantity > onHand) {
      throw new Error(`Only ${onHand} ${item.unit} of ${item.name} in stock`);
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: round2(onHand - opts.quantity) },
    });
    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        type: "TRANSFER",
        quantity: opts.quantity,
        reason: `Issued to ${opts.destination.toLowerCase()}${opts.note ? ` — ${opts.note}` : ""}`,
        userId: opts.userId,
      },
    });
    return tx.goodsIssue.create({
      data: {
        tenantId: opts.tenantId,
        branchId: item.branchId,
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        quantity: opts.quantity,
        destination: opts.destination,
        note: opts.note,
        issuedById: opts.userId,
      },
      include: { issuedBy: { select: { name: true } } },
    });
  });

  const role = opts.destination === "KITCHEN" ? "kitchen" : "barista";
  await notifyRoleInBranch(issue.branchId, role, "goods_issued", "Goods from store", `${toNum(issue.quantity)} ${issue.unit} ${issue.itemName} sent — confirm receipt.`);
  return issue;
}

/**
 * Station receipt confirmation (double-entry leg 2). Marks the issue RECEIVED
 * with who/when — the ledger row is permanent and idempotent-guarded.
 */
export async function receiveGoods(opts: { issueId: string; tenantId: string; userId: string }) {
  const issue = await prisma.goodsIssue.findFirst({ where: { id: opts.issueId, tenantId: opts.tenantId } });
  if (!issue) throw new Error("Goods issue not found");
  if (issue.status === "RECEIVED") throw new Error("Already received");

  const updated = await prisma.goodsIssue.update({
    where: { id: issue.id },
    data: { status: "RECEIVED", receivedById: opts.userId, receivedAt: new Date() },
    include: { receivedBy: { select: { name: true } } },
  });
  await notifyRoleInBranch(issue.branchId, "store_manager", "goods_received", "Goods received", `${toNum(issue.quantity)} ${issue.unit} ${issue.itemName} confirmed by ${updated.receivedBy?.name ?? "station"}.`);
  return updated;
}

export async function lowStockAlerts(tenantId: string, branchId?: string) {
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId, ...(branchId ? { branchId } : {}) },
  });
  return items
    .map((i) => ({ ...i, quantity: toNum(i.quantity), minThreshold: toNum(i.minThreshold), status: stockStatus(toNum(i.quantity), toNum(i.minThreshold)) }))
    .filter((i) => i.status !== "OK");
}
