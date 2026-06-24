import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const db = tenantDb(me.tenantId);
  const categories = await db.menuCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { include: { modifiers: true }, orderBy: { name: "asc" } } },
  });
  return ok({ categories });
});
