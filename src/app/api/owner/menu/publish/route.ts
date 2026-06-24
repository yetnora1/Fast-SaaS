import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { audit } from "@/lib/audit";

// Publish all DRAFT menu items for this tenant (draft → published, spec §2.4).
export const POST = handler(async () => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const cats = await tenantDb(me.tenantId).menuCategory.findMany({ select: { id: true } });
  const result = await prisma.menuItem.updateMany({
    where: { categoryId: { in: cats.map((c) => c.id) }, state: "DRAFT" },
    data: { state: "PUBLISHED" },
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "owner.menu.publish", meta: { published: result.count } });
  return ok({ published: result.count });
});
