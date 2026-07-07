import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum } from "@/lib/money";
import type { GoodsDestination } from "@prisma/client";

/**
 * Station-side view of store goods: pending deliveries to confirm plus recent
 * history. Kitchen sees KITCHEN issues, barista sees BARISTA; managers/owners
 * may pass ?station= to inspect either.
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("kitchen", "barista", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const stationParam = url.searchParams.get("station");
  const destination: GoodsDestination =
    me.role === "kitchen" ? "KITCHEN" : me.role === "barista" ? "BARISTA" : stationParam === "BARISTA" ? "BARISTA" : "KITCHEN";
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;

  const issues = await prisma.goodsIssue.findMany({
    where: { tenantId: me.tenantId, ...(branchId ? { branchId } : {}), destination },
    include: { issuedBy: { select: { name: true } }, receivedBy: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { issuedAt: "desc" }], // ISSUED (pending) first
    take: 200,
  });
  return ok({ destination, issues: issues.map((i) => ({ ...i, quantity: toNum(i.quantity) })) });
});
