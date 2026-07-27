import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { usageVariance } from "@/lib/services/recipe-costing";

/**
 * GET — theoretical vs actual ingredient usage.
 *
 * What the recipes say the period's sales should have consumed, against what
 * the store actually issued. Stock levels are untouched; this is the visibility
 * layer over waste and shrinkage.
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const url = new URL(req.url);

  const branchId = url.searchParams.get("branchId") ?? undefined;
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const rows = await usageVariance({ tenantId: me.tenantId, branchId, from, to });

  return ok({
    from,
    to,
    days,
    rows,
    // Net birr value of the gap: positive means more was issued than the
    // recipes account for.
    totalVarianceValue: rows.reduce((s, r) => s + r.varianceValue, 0),
  });
});
