import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";

/**
 * Cost of one sold line.
 *
 * Prefers the unit cost frozen onto the line at the moment of sale, so a change
 * to an ingredient price today cannot rewrite a margin already reported. Lines
 * sold before recipes existed have no snapshot and fall back to the menu item's
 * manual cost — exactly what they were always costed at.
 */
function lineCost(it: { quantity: number; unitCost: unknown; menuItem: { cost: unknown } }): number {
  const frozen = it.unitCost === null || it.unitCost === undefined ? null : toNum(it.unitCost as never);
  return (frozen ?? toNum(it.menuItem.cost as never)) * it.quantity;
}

/** get_dashboard_kpis() equivalent — aggregate Owner dashboard metrics in one call. */
export async function ownerDashboardKpis(tenantId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // "join" resolves payments/items/menuItem in one LATERAL JOIN instead of a
  // round trip per relation level; `select` keeps only the fields used below.
  const orders = await prisma.order.findMany({
    where: { tenantId, createdAt: { gte: startOfToday } },
    relationLoadStrategy: "join",
    select: {
      status: true,
      payments: { where: { status: "CONFIRMED" }, select: { amount: true, method: true } },
      items: { select: { quantity: true, unitPrice: true, unitCost: true, menuItemId: true, menuItem: { select: { name: true, cost: true } } } },
    },
  });

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const revenue = completed.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + toNum(p.amount), 0), 0);
  const cost = completed.reduce((s, o) => s + o.items.reduce((is, it) => is + lineCost(it), 0), 0);

  // Payment method split.
  const methodTotals: Record<string, number> = { CASH: 0, TELEBIRR: 0, CBE_BIRR: 0 };
  for (const o of completed) for (const p of o.payments) methodTotals[p.method] = (methodTotals[p.method] ?? 0) + toNum(p.amount);

  // Top items today.
  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of completed)
    for (const it of o.items) {
      const cur = itemCounts.get(it.menuItemId) ?? { name: it.menuItem.name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += toNum(it.unitPrice) * it.quantity;
      itemCounts.set(it.menuItemId, cur);
    }
  const topItems = [...itemCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    revenue: round2(revenue),
    netProfit: round2(revenue - cost),
    orders: orders.length,
    completedOrders: completed.length,
    paymentBreakdown: methodTotals,
    topItems,
  };
}

export async function branchComparison(tenantId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // Was an N+1: one nested-include query per branch, awaited in series. Against a
  // remote DB that is (branches x relation-levels) round trips. Now it is two
  // queries in a single wave, grouped in memory — same numbers, same order.
  const [branches, orders] = await Promise.all([
    prisma.branch.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    prisma.order.findMany({
      where: { tenantId, status: "COMPLETED", createdAt: { gte: startOfToday } },
      relationLoadStrategy: "join",
      select: {
        branchId: true,
        payments: { where: { status: "CONFIRMED" }, select: { amount: true } },
        items: { select: { quantity: true, unitCost: true, menuItem: { select: { cost: true } } } },
      },
    }),
  ]);

  const byBranch = new Map<string, typeof orders>();
  for (const o of orders) {
    const list = byBranch.get(o.branchId);
    if (list) list.push(o);
    else byBranch.set(o.branchId, [o]);
  }

  return branches.map((b) => {
    const branchOrders = byBranch.get(b.id) ?? [];
    const revenue = branchOrders.reduce((s, o) => s + o.payments.reduce((p, x) => p + toNum(x.amount), 0), 0);
    const cost = branchOrders.reduce((s, o) => s + o.items.reduce((c, it) => c + lineCost(it), 0), 0);
    return {
      branchId: b.id,
      name: b.name,
      revenue: round2(revenue),
      orders: branchOrders.length,
      margin: revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0,
    };
  });
}
