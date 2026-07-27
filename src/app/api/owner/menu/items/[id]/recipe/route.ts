import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";
import { costMenuItem, isUnitCompatible, UNITS_FOR_BASE } from "@/lib/services/recipe-costing";

const ROLES = ["cafe_owner", "cafe_manager"] as const;

/** Menu items belong to a tenant through their category — verify before touching. */
async function assertOwnedItem(tenantId: string, menuItemId: string) {
  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, category: { tenantId } },
    select: { id: true, name: true, price: true, cost: true },
  });
  return item;
}

/**
 * GET — the recipe plus a costed breakdown per branch.
 *
 * Costs are returned for every branch rather than one, because the same recipe
 * legitimately costs different amounts where ingredients were bought at
 * different prices, and the owner should see that spread.
 */
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant(...ROLES);
  const item = await assertOwnedItem(me.tenantId, params.id);
  if (!item) return fail("Menu item not found", 404);

  const [lines, branches] = await Promise.all([
    prisma.recipeLine.findMany({
      where: { menuItemId: item.id },
      relationLoadStrategy: "join",
      select: {
        id: true, quantity: true, unit: true,
        ingredient: { select: { id: true, name: true, baseUnit: true } },
      },
      orderBy: { ingredient: { name: "asc" } },
    }),
    prisma.branch.findMany({ where: { tenantId: me.tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const price = toNum(item.price);
  const costs = await Promise.all(
    branches.map(async (b) => {
      const c = await costMenuItem(item.id, b.id);
      return {
        branchId: b.id,
        branchName: b.name,
        cost: c.cost,
        margin: price > 0 ? round2(((price - c.cost) / price) * 100) : 0,
        profit: round2(price - c.cost),
        missingIngredients: c.missingIngredients,
        lines: c.lines,
      };
    }),
  );

  return ok({
    menuItem: { id: item.id, name: item.name, price, manualCost: toNum(item.cost) },
    lines: lines.map((l) => ({
      id: l.id,
      ingredientId: l.ingredient.id,
      ingredientName: l.ingredient.name,
      baseUnit: l.ingredient.baseUnit,
      quantity: toNum(l.quantity),
      unit: l.unit,
      allowedUnits: UNITS_FOR_BASE[l.ingredient.baseUnit],
    })),
    branchCosts: costs,
    hasRecipe: lines.length > 0,
  });
});

const PutSchema = z.object({
  lines: z.array(z.object({
    ingredientId: z.string().min(1),
    quantity: z.number().positive("Quantity must be greater than zero"),
    unit: z.enum(["G", "KG", "ML", "L", "PIECE"]),
  })).max(60),
});

/**
 * PUT — replace the whole recipe.
 *
 * Replace rather than patch: the editor always submits the complete list, and a
 * whole-list write cannot leave a half-applied recipe that silently mis-costs
 * every future sale.
 */
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant(...ROLES);
  const item = await assertOwnedItem(me.tenantId, params.id);
  if (!item) return fail("Menu item not found", 404);

  const { lines } = PutSchema.parse(await req.json().catch(() => ({})));

  // Reject duplicates up front — the DB unique constraint would fail anyway,
  // but with a message the owner cannot act on.
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.ingredientId)) return fail("The same ingredient is listed twice", 422);
    seen.add(l.ingredientId);
  }

  // Every ingredient must belong to this cafe, and the unit must make sense for
  // it — grams of milk, or millilitres of sugar, would silently mis-cost.
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: [...seen] }, tenantId: me.tenantId },
    select: { id: true, name: true, baseUnit: true },
  });
  if (ingredients.length !== seen.size) return fail("Unknown ingredient in recipe", 422);

  const baseById = new Map(ingredients.map((i) => [i.id, i]));
  for (const l of lines) {
    const ing = baseById.get(l.ingredientId)!;
    if (!isUnitCompatible(ing.baseUnit, l.unit)) {
      return fail(`${ing.name} is stocked in ${ing.baseUnit}; use ${UNITS_FOR_BASE[ing.baseUnit].join(" or ")}`, 422);
    }
  }

  await prisma.$transaction([
    prisma.recipeLine.deleteMany({ where: { menuItemId: item.id } }),
    ...(lines.length
      ? [prisma.recipeLine.createMany({
          data: lines.map((l) => ({ menuItemId: item.id, ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit })),
        })]
      : []),
  ]);

  return ok({ saved: lines.length });
});
