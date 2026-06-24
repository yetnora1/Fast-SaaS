import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

// Active published menu for ordering.
export const GET = handler(async () => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const categories = await tenantDb(me.tenantId).menuCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { state: "PUBLISHED", available: true }, include: { modifiers: true } } },
  });
  return ok({ categories });
});
