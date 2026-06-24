import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";

export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? undefined;
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : startOfToday();
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();

  const orders = await prisma.order.findMany({
    where: { tenantId: me.tenantId, ...(branchId ? { branchId } : {}), status: "COMPLETED", createdAt: { gte: from, lte: to } },
    include: { payments: { where: { status: "CONFIRMED" } } },
  });

  // Hourly buckets.
  const buckets = new Map<number, number>();
  let revenue = 0;
  for (const o of orders) {
    const amt = o.payments.reduce((s, p) => s + toNum(p.amount), 0);
    revenue += amt;
    const h = new Date(o.createdAt).getHours();
    buckets.set(h, (buckets.get(h) ?? 0) + amt);
  }
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, revenue: round2(buckets.get(h) ?? 0) }));

  return ok({ revenue: round2(revenue), orders: orders.length, avgOrderValue: orders.length ? round2(revenue / orders.length) : 0, hourly });
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
