import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";

/** get_dashboard_kpis() equivalent — aggregate Owner dashboard metrics in one call. */
export async function ownerDashboardKpis(tenantId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { tenantId, createdAt: { gte: startOfToday } },
    include: { payments: { where: { status: "CONFIRMED" } }, items: { include: { menuItem: true } } },
  });

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const revenue = completed.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + toNum(p.amount), 0), 0);
  const cost = completed.reduce(
    (s, o) => s + o.items.reduce((is, it) => is + toNum(it.menuItem.cost) * it.quantity, 0),
    0,
  );

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
  const branches = await prisma.branch.findMany({ where: { tenantId } });
  const out = [];
  for (const b of branches) {
    const orders = await prisma.order.findMany({
      where: { tenantId, branchId: b.id, status: "COMPLETED", createdAt: { gte: startOfToday } },
      include: { payments: { where: { status: "CONFIRMED" } }, items: { include: { menuItem: true } } },
    });
    const revenue = orders.reduce((s, o) => s + o.payments.reduce((p, x) => p + toNum(x.amount), 0), 0);
    const cost = orders.reduce((s, o) => s + o.items.reduce((c, it) => c + toNum(it.menuItem.cost) * it.quantity, 0), 0);
    out.push({
      branchId: b.id,
      name: b.name,
      revenue: round2(revenue),
      orders: orders.length,
      margin: revenue > 0 ? round2(((revenue - cost) / revenue) * 100) : 0,
    });
  }
  return out;
}
