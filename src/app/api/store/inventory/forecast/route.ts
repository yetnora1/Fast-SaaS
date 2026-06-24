import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { stockForecast } from "@/lib/services/inventory";

export const GET = handler(async () => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  return ok({ forecast: await stockForecast(me.tenantId) });
});
