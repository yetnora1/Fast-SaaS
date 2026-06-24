import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { notifyRoleInBranch } from "@/lib/services/notifications";

// Flag an ingredient low → alert Store Manager + Manager (spec §6.3).
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("barista", "kitchen", "cafe_manager", "cafe_owner");
  const item = await tenantDb(me.tenantId).inventoryItem.findFirst({ where: { id: params.id } });
  if (!item) return fail("Ingredient not found", 404);
  await notifyRoleInBranch(item.branchId, "store_manager", "low_stock", "Low stock flagged", `${item.name} flagged low by ${me.name}.`);
  await notifyRoleInBranch(item.branchId, "cafe_manager", "low_stock", "Low stock flagged", `${item.name} flagged low.`);
  return ok({ flagged: true });
});
