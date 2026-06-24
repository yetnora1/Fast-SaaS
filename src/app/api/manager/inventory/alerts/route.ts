import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { lowStockAlerts } from "@/lib/services/inventory";

export const GET = handler(async (req: Request) => {
  const me = await requireRole("cafe_manager", "cafe_owner");
  if (!me.tenantId) return ok({ alerts: [] });
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const alerts = await lowStockAlerts(me.tenantId, branchId);
  return ok({ alerts: alerts.map((a) => ({ id: a.id, name: a.name, quantity: a.quantity, minThreshold: a.minThreshold, unit: a.unit, status: a.status })) });
});
