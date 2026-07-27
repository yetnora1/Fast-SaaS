import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";
import { stockStatus } from "@/lib/services/inventory";

/**
 * Comprehensive cafe status — everything in one API call:
 *  revenue, profit, costs, credits, staff, inventory, orders, equipment
 */
export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const tid = me.tenantId;

  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Every read below is independent, so they all go out in ONE parallel wave.
  // This route previously awaited in 8 sequential waves; against the remote DB
  // (~171ms round trip) that alone cost seconds before any work was done.
  //
  // Two further wins, both output-identical:
  //   • `select` instead of `include` — same maths, far less data on the wire.
  //   • relationLoadStrategy "join" — resolves payments/items/menuItem in one
  //     LATERAL JOIN rather than a round trip per relation level.
  const [
    ordersToday, ordersMonth, ordersLastMonth,
    purchaseOrders,
    staffCount, activeToday,
    inventory,
    equipTotal, equipMaintenance,
    branchCount,
    menuItems, categories,
    supplierCount,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: tid, createdAt: { gte: startOfToday } },
      relationLoadStrategy: "join",
      select: {
        status: true,
        payments: { where: { status: "CONFIRMED" }, select: { amount: true } },
        items: { select: { quantity: true, unitPrice: true, menuItemId: true, menuItem: { select: { name: true, cost: true } } } },
      },
    }),
    prisma.order.findMany({
      where: { tenantId: tid, status: "COMPLETED", createdAt: { gte: startOfMonth } },
      relationLoadStrategy: "join",
      select: {
        payments: { where: { status: "CONFIRMED" }, select: { amount: true, method: true } },
        items: { select: { quantity: true, menuItem: { select: { cost: true } } } },
      },
    }),
    prisma.order.findMany({
      where: { tenantId: tid, status: "COMPLETED", createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      relationLoadStrategy: "join",
      select: { payments: { where: { status: "CONFIRMED" }, select: { amount: true } } },
    }),
    prisma.purchaseOrder.findMany({
      where: { tenantId: tid },
      select: { total: true, paidAmount: true, creditAmount: true, isCredit: true },
    }),
    prisma.user.count({ where: { tenantId: tid, role: { not: "cafe_owner" } } }),
    prisma.staffAttendance.count({ where: { user: { tenantId: tid }, clockIn: { gte: startOfToday } } }),
    prisma.inventoryItem.findMany({
      where: { tenantId: tid },
      select: { quantity: true, minThreshold: true, costPerUnit: true },
    }),
    prisma.equipmentItem.count({ where: { tenantId: tid } }),
    prisma.equipmentItem.count({ where: { tenantId: tid, condition: "NEEDS_REPAIR" } }),
    prisma.branch.count({ where: { tenantId: tid } }),
    prisma.menuItem.count({ where: { category: { tenantId: tid } } }),
    prisma.menuCategory.count({ where: { tenantId: tid } }),
    prisma.supplier.count({ where: { tenantId: tid } }),
  ]);

  const completedToday = ordersToday.filter((o) => o.status === "COMPLETED");
  const revenueToday = completedToday.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + toNum(p.amount), 0), 0);
  const costToday = completedToday.reduce((s, o) => s + o.items.reduce((is, it) => is + toNum(it.menuItem.cost) * it.quantity, 0), 0);
  const profitToday = revenueToday - costToday;

  const revenueMonth = ordersMonth.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + toNum(p.amount), 0), 0);
  const costMonth = ordersMonth.reduce((s, o) => s + o.items.reduce((is, it) => is + toNum(it.menuItem.cost) * it.quantity, 0), 0);
  const profitMonth = revenueMonth - costMonth;
  const revenueLastMonth = ordersLastMonth.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + toNum(p.amount), 0), 0);

  // Payment methods this month
  const methodTotals: Record<string, number> = {};
  for (const o of ordersMonth) for (const p of o.payments) methodTotals[p.method] = (methodTotals[p.method] ?? 0) + toNum(p.amount);

  // ── Purchase Credits ──────────────────────────────
  const totalPurchases = purchaseOrders.reduce((s, p) => s + toNum(p.total), 0);
  const totalPaid = purchaseOrders.reduce((s, p) => s + toNum(p.paidAmount), 0);
  const totalCredit = purchaseOrders.reduce((s, p) => s + toNum(p.creditAmount), 0);
  const creditOrdersCount = purchaseOrders.filter((p) => p.isCredit && toNum(p.creditAmount) > 0).length;

  // ── Inventory ─────────────────────────────────────
  const invTotal = inventory.length;
  const lowStock = inventory.filter((i) => stockStatus(toNum(i.quantity), toNum(i.minThreshold)) !== "OK").length;
  const invValue = inventory.reduce((s, i) => s + toNum(i.quantity) * toNum(i.costPerUnit), 0);

  // ── Top items today ───────────────────────────────
  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of completedToday)
    for (const it of o.items) {
      const cur = itemCounts.get(it.menuItemId) ?? { name: it.menuItem.name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += toNum(it.unitPrice) * it.quantity;
      itemCounts.set(it.menuItemId, cur);
    }
  const topItems = [...itemCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);

  return ok({
    today: {
      revenue: round2(revenueToday),
      cost: round2(costToday),
      profit: round2(profitToday),
      margin: revenueToday > 0 ? round2((profitToday / revenueToday) * 100) : 0,
      orders: ordersToday.length,
      completed: completedToday.length,
      pending: ordersToday.length - completedToday.length,
    },
    month: {
      revenue: round2(revenueMonth),
      cost: round2(costMonth),
      profit: round2(profitMonth),
      margin: revenueMonth > 0 ? round2((profitMonth / revenueMonth) * 100) : 0,
      orders: ordersMonth.length,
      revenueLastMonth: round2(revenueLastMonth),
      growth: revenueLastMonth > 0 ? round2(((revenueMonth - revenueLastMonth) / revenueLastMonth) * 100) : 0,
    },
    payments: methodTotals,
    purchases: {
      total: round2(totalPurchases),
      paid: round2(totalPaid),
      credit: round2(totalCredit),
      creditOrders: creditOrdersCount,
      orderCount: purchaseOrders.length,
    },
    staff: { total: staffCount, activeToday },
    inventory: { total: invTotal, lowStock, value: round2(invValue) },
    equipment: { total: equipTotal, needsRepair: equipMaintenance },
    branches: branchCount,
    menu: { items: menuItems, categories },
    suppliers: supplierCount,
    topItems,
  });
});
