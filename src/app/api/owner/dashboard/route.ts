import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { ownerDashboardKpis, branchComparison } from "@/lib/services/dashboard";
import { lowStockAlerts } from "@/lib/services/inventory";

export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const [kpis, branches, lowStock] = await Promise.all([
    ownerDashboardKpis(me.tenantId),
    branchComparison(me.tenantId),
    lowStockAlerts(me.tenantId),
  ]);
  return ok({ kpis, branches, lowStock: lowStock.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, minThreshold: i.minThreshold, status: i.status, unit: i.unit })) });
});
