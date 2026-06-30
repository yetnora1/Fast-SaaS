import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

/**
 * Feedback API — role-aware routing:
 *  • cafe_owner  → ALL feedback across all branches
 *  • cafe_manager → ALL feedback in their branch
 *  • barista      → feedback for orders containing BARISTA station items
 *  • kitchen      → feedback for orders containing KITCHEN station items
 */
export const GET = handler(async () => {
  const me = await requireTenant(
    "cafe_owner",
    "cafe_manager",
    "barista",
    "kitchen",
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Base filter: today's orders with feedback
  const where: Record<string, unknown> = {
    feedbackRating: { not: null },
    createdAt: { gte: today },
  };

  // Scope by role
  if (me.role === "cafe_owner") {
    where.tenantId = me.tenantId;
  } else if (me.role === "cafe_manager") {
    where.tenantId = me.tenantId;
    if (me.branchId) where.branchId = me.branchId;
  } else if (me.role === "barista") {
    where.tenantId = me.tenantId;
    if (me.branchId) where.branchId = me.branchId;
    // Only orders that have at least one BARISTA station item
    where.items = { some: { station: "BARISTA" } };
  } else if (me.role === "kitchen") {
    where.tenantId = me.tenantId;
    if (me.branchId) where.branchId = me.branchId;
    // Only orders that have at least one KITCHEN station item
    where.items = { some: { station: "KITCHEN" } };
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      feedbackRating: true,
      feedbackComment: true,
      createdAt: true,
      table: { select: { number: true } },
      branch: { select: { name: true } },
      items: {
        select: {
          menuItem: { select: { name: true, nameAm: true } },
          station: true,
          quantity: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  // Compute aggregate stats
  const ratings = orders.map((o) => o.feedbackRating!);
  const avg =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;
  const distribution = [0, 0, 0, 0, 0]; // index 0=1star ... 4=5star
  for (const r of ratings) distribution[r - 1]++;

  const feedback = orders.map((o) => ({
    orderId: o.id,
    rating: o.feedbackRating!,
    comment: o.feedbackComment ?? null,
    table: o.table?.number ?? null,
    branch: o.branch.name,
    time: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      name: i.menuItem.name,
      nameAm: i.menuItem.nameAm ?? null,
      station: i.station,
      qty: i.quantity,
    })),
  }));

  return ok({
    feedback,
    stats: {
      total: ratings.length,
      average: Math.round(avg * 10) / 10,
      distribution,
    },
  });
});
