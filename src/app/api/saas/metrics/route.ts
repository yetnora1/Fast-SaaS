import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { getDynamicPaymentConfig } from "@/lib/subscription";
import { toNum, round2 } from "@/lib/money";

// Platform KPIs: MRR, ARR, active tenants, pending approvals (spec §1.2/§14.2).
export const GET = handler(async () => {
  await requireRole("saas_owner");
  const now = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);

  const [
    total,
    active,
    trialing,
    expiringSoon,
    pendingApprovals,
    approvedSubs,
    totalBranches,
    totalMenuItems,
    totalOrders,
    gmvAgg,
    suspendedCount,
    expiredCount,
    recentSubs,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "active", subEnd: { gt: now } } }),
    prisma.tenant.count({ where: { status: "active", subEnd: null, trialEnd: { gt: now } } }),
    prisma.tenant.count({ where: { status: "active", subEnd: { gt: now, lt: in30 } } }),
    prisma.subscription.count({ where: { status: "PENDING" } }),
    prisma.subscription.findMany({ where: { status: "APPROVED", periodEnd: { gt: now } } }),
    prisma.branch.count(),
    prisma.menuItem.count(),
    prisma.order.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "CONFIRMED" } }),
    prisma.tenant.count({ where: { status: { in: ["suspended", "terminated"] } } }),
    prisma.tenant.count({
      where: {
        status: "active",
        AND: [
          { OR: [ { trialEnd: { lt: now } }, { trialEnd: null } ] },
          { OR: [ { subEnd: { lt: now } }, { subEnd: null } ] },
        ]
      }
    }),
    prisma.subscription.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { name: true } }
      }
    }),
  ]);

  // Each active 6-month subscription contributes amount/6 per month.
  const monthly = approvedSubs.reduce((s, sub) => s + toNum(sub.amount) / 6, 0);
  const mrr = round2(monthly);
  const arr = round2(monthly * 12);
  const totalGmv = toNum(gmvAgg._sum.amount ?? 0);

  const paymentConfig = await getDynamicPaymentConfig();

  return ok({
    totalTenants: total,
    activeTenants: active,
    trialingTenants: trialing,
    expiringSoon,
    pendingApprovals,
    mrr,
    arr,
    subscriptionAmount: paymentConfig.amount,
    activity: {
      totalBranches,
      totalMenuItems,
      totalOrders,
      totalGmv,
    },
    breakdown: {
      active,
      trialing,
      expired: expiredCount,
      suspended: suspendedCount,
    },
    recentSubscriptions: recentSubs.map((s) => ({
      id: s.id,
      tenantName: s.tenant.name,
      amount: toNum(s.amount),
      status: s.status,
      createdAt: s.createdAt,
    })),
  });
});
