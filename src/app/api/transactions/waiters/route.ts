import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum } from "@/lib/money";

// Per-waiter performance for owners & managers: how many orders each waiter
// handled and how much revenue (confirmed payments) those orders collected,
// over a chosen period. Owners see the whole tenant; managers their branch.

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month" | "6month" | "year";

function windowStart(period: Period): Date {
  const now = new Date();
  if (period === "day") {
    // Start of today in Ethiopian time (UTC+3), consistent with the rest of the app.
    const eat = new Date(now.getTime() + 3 * 3600 * 1000);
    eat.setUTCHours(0, 0, 0, 0);
    return new Date(eat.getTime() - 3 * 3600 * 1000);
  }
  const days = period === "week" ? 7 : period === "month" ? 30 : period === "6month" ? 182 : 365;
  return new Date(now.getTime() - days * 24 * 3600 * 1000);
}

export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const branchId = me.role === "cafe_manager" ? me.branchId ?? undefined : undefined;

  const url = new URL(req.url);
  const periodParam = (url.searchParams.get("period") ?? "week") as Period;
  const period: Period = ["day", "week", "month", "6month", "year"].includes(periodParam) ? periodParam : "week";
  const from = windowStart(period);

  // Orders assigned to a waiter in the window (excluding never-served states),
  // with their confirmed payments so we can attribute collected revenue.
  const orders = await prisma.order.findMany({
    where: {
      tenantId: me.tenantId,
      ...(branchId ? { branchId } : {}),
      waiterId: { not: null },
      createdAt: { gte: from },
      status: { notIn: ["DRAFT", "CANCELLED", "DECLINED"] },
    },
    select: {
      waiterId: true,
      payments: { where: { status: "CONFIRMED" }, select: { amount: true } },
    },
  });

  const agg = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const wid = o.waiterId!;
    const cur = agg.get(wid) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += o.payments.reduce((s, p) => s + toNum(p.amount), 0);
    agg.set(wid, cur);
  }

  const ids = [...agg.keys()];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameMap = new Map(users.map((u) => [u.id, u.name]));

  const rows = ids
    .map((id) => ({
      waiterId: id,
      name: nameMap.get(id) ?? "—",
      orders: agg.get(id)!.orders,
      revenue: agg.get(id)!.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return ok({ rows, period, scope: branchId ? "branch" : "tenant" });
});
