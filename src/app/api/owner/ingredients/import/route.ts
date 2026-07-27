import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { inferBaseUnit } from "@/lib/services/recipe-costing";

/**
 * POST — bootstrap the catalog from what the store already stocks.
 *
 * Without this the owner would have to retype every ingredient they have
 * already entered in the store. One call turns each distinct unlinked stock
 * name into a catalog entry, infers its unit from the text already there, and
 * adopts the matching rows in every branch.
 */
export const POST = handler(async () => {
  const me = await requireTenant("cafe_owner", "cafe_manager");

  const unlinked = await prisma.inventoryItem.findMany({
    where: { tenantId: me.tenantId, ingredientId: null },
    select: { name: true, unit: true },
  });

  // One catalog entry per distinct name, keeping the first spelling seen.
  const byName = new Map<string, { name: string; unit: string }>();
  for (const item of unlinked) {
    const key = item.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, { name: item.name.trim(), unit: item.unit });
  }
  if (byName.size === 0) return ok({ created: 0, linked: 0 });

  // Skip names already in the catalog so a second run is a no-op rather than a
  // duplicate-key failure.
  const existing = await prisma.ingredient.findMany({
    where: { tenantId: me.tenantId },
    select: { name: true },
  });
  for (const e of existing) byName.delete(e.name.trim().toLowerCase());

  let created = 0;
  let linked = 0;
  for (const { name, unit } of byName.values()) {
    const ingredient = await prisma.ingredient.create({
      data: { tenantId: me.tenantId, name, baseUnit: inferBaseUnit(unit) },
    });
    created++;
    const adopted = await prisma.inventoryItem.updateMany({
      where: { tenantId: me.tenantId, ingredientId: null, name: { equals: name, mode: "insensitive" } },
      data: { ingredientId: ingredient.id },
    });
    linked += adopted.count;
  }

  return ok({ created, linked });
});
