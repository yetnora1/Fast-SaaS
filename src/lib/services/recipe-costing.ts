import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";
import type { IngredientUnit, RecipeUnit } from "@prisma/client";

/**
 * Ingredient costing.
 *
 *   owner encodes a recipe   ->  1 machiato = 8 g coffee + 120 ml milk + 5 g sugar
 *   store encodes what it paid ->  sugar 60 birr / kg
 *   this module multiplies out ->  5 g sugar = 60 / 1000 * 5 = 0.30 birr
 *
 * Prices come from the InventoryItem of the ORDER'S BRANCH, so two branches
 * buying sugar at different prices produce different costs for the same recipe
 * and branch margins stay truthful.
 */

/** Every recipe unit expressed as a multiple of its ingredient's base unit. */
const TO_BASE: Record<RecipeUnit, number> = {
  G: 0.001, // 1000 g = 1 kg
  KG: 1,
  ML: 0.001, // 1000 ml = 1 L
  L: 1,
  PIECE: 1,
};

/** Which recipe units may be used for each stocking unit. */
export const UNITS_FOR_BASE: Record<IngredientUnit, RecipeUnit[]> = {
  KG: ["G", "KG"],
  L: ["ML", "L"],
  PIECE: ["PIECE"],
};

export function isUnitCompatible(base: IngredientUnit, unit: RecipeUnit): boolean {
  return UNITS_FOR_BASE[base].includes(unit);
}

/**
 * Guess a stocking unit from the free-text unit already on an inventory item, so
 * importing an existing store list does not make the owner retype it all.
 * "kg"/"g" -> KG, "l"/"ml" -> L, anything else (loaf, pcs, tray) -> PIECE.
 */
export function inferBaseUnit(unitText: string): IngredientUnit {
  const u = unitText.trim().toLowerCase();
  if (["kg", "kgs", "kilo", "kilogram", "g", "gram", "grams"].includes(u)) return "KG";
  if (["l", "lt", "ltr", "litre", "liter", "ml", "millilitre", "milliliter"].includes(u)) return "L";
  return "PIECE";
}

/** Convert a recipe quantity into the ingredient's base unit (kg / L / piece). */
export function toBaseQuantity(quantity: number, unit: RecipeUnit): number {
  return quantity * TO_BASE[unit];
}

export interface CostLine {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: RecipeUnit;
  baseUnit: IngredientUnit;
  /** Price per base unit at this branch, or null when the branch does not stock it. */
  costPerUnit: number | null;
  /** quantity-in-base x costPerUnit, 0 when the price is unknown. */
  lineCost: number;
}

export interface MenuItemCost {
  menuItemId: string;
  /** True when the item has at least one recipe line. */
  hasRecipe: boolean;
  /** Summed cost of one unit. */
  cost: number;
  lines: CostLine[];
  /**
   * Ingredients the recipe needs that this branch has no stock row for. Their
   * cost counts as 0, so the total is understated — surfaced rather than hidden,
   * because a silently-cheap item would quietly inflate reported profit.
   */
  missingIngredients: string[];
}

/**
 * Cost one unit of each given menu item at one branch.
 *
 * Batched deliberately: costing a whole menu or a day of orders one item at a
 * time would be a round trip each against a remote database.
 */
export async function costMenuItems(menuItemIds: string[], branchId: string): Promise<Map<string, MenuItemCost>> {
  const out = new Map<string, MenuItemCost>();
  if (menuItemIds.length === 0) return out;

  const ids = [...new Set(menuItemIds)];
  const lines = await prisma.recipeLine.findMany({
    where: { menuItemId: { in: ids } },
    relationLoadStrategy: "join",
    select: {
      menuItemId: true,
      quantity: true,
      unit: true,
      ingredient: {
        select: {
          id: true,
          name: true,
          baseUnit: true,
          // Only this branch's stock row carries the price that applies here.
          stockItems: { where: { branchId }, select: { costPerUnit: true }, take: 1 },
        },
      },
    },
  });

  for (const id of ids) {
    out.set(id, { menuItemId: id, hasRecipe: false, cost: 0, lines: [], missingIngredients: [] });
  }

  for (const line of lines) {
    const entry = out.get(line.menuItemId)!;
    const stock = line.ingredient.stockItems[0];
    const costPerUnit = stock ? toNum(stock.costPerUnit) : null;
    const qty = toNum(line.quantity);
    const lineCost = costPerUnit === null ? 0 : round2(toBaseQuantity(qty, line.unit) * costPerUnit);

    entry.hasRecipe = true;
    entry.cost = round2(entry.cost + lineCost);
    entry.lines.push({
      ingredientId: line.ingredient.id,
      ingredientName: line.ingredient.name,
      quantity: qty,
      unit: line.unit,
      baseUnit: line.ingredient.baseUnit,
      costPerUnit,
      lineCost,
    });
    if (costPerUnit === null) entry.missingIngredients.push(line.ingredient.name);
  }

  return out;
}

/** Single-item convenience wrapper. */
export async function costMenuItem(menuItemId: string, branchId: string): Promise<MenuItemCost> {
  return (await costMenuItems([menuItemId], branchId)).get(menuItemId)!;
}

/**
 * Unit cost to freeze onto an order line at the moment of sale.
 *
 * Falls back to the menu item's manually-entered cost when there is no recipe
 * yet, so items that have not been costed keep behaving exactly as before.
 */
export async function resolveUnitCosts(
  menuItemIds: string[],
  branchId: string,
): Promise<Map<string, number>> {
  const ids = [...new Set(menuItemIds)];
  const [costs, manual] = await Promise.all([
    costMenuItems(ids, branchId),
    prisma.menuItem.findMany({ where: { id: { in: ids } }, select: { id: true, cost: true } }),
  ]);
  const manualById = new Map(manual.map((m) => [m.id, toNum(m.cost)]));

  const out = new Map<string, number>();
  for (const id of ids) {
    const c = costs.get(id);
    out.set(id, c?.hasRecipe ? c.cost : manualById.get(id) ?? 0);
  }
  return out;
}

/**
 * Theoretical ingredient usage for a period: what the recipes say the sales
 * SHOULD have consumed, next to what the store actually issued.
 *
 * Stock levels are untouched — GoodsIssue remains the only thing that moves
 * them. This is the variance report that makes waste and shrinkage visible.
 */
export async function usageVariance(opts: { tenantId: string; branchId?: string; from: Date; to: Date }) {
  const { tenantId, branchId, from, to } = opts;

  const [soldItems, issues, ingredients] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          status: "COMPLETED",
          createdAt: { gte: from, lte: to },
          ...(branchId ? { branchId } : {}),
        },
      },
      select: { menuItemId: true, quantity: true },
    }),
    prisma.goodsIssue.groupBy({
      by: ["itemId"],
      where: { tenantId, ...(branchId ? { branchId } : {}), issuedAt: { gte: from, lte: to } },
      _sum: { quantity: true },
    }),
    prisma.ingredient.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, baseUnit: true,
        stockItems: { where: branchId ? { branchId } : {}, select: { id: true, costPerUnit: true } },
      },
    }),
  ]);

  // Sold quantity per menu item.
  const soldByMenuItem = new Map<string, number>();
  for (const s of soldItems) soldByMenuItem.set(s.menuItemId, (soldByMenuItem.get(s.menuItemId) ?? 0) + s.quantity);

  const recipeLines = await prisma.recipeLine.findMany({
    where: { menuItemId: { in: [...soldByMenuItem.keys()] } },
    select: { menuItemId: true, ingredientId: true, quantity: true, unit: true },
  });

  // Expected consumption per ingredient, in base units.
  const expected = new Map<string, number>();
  for (const line of recipeLines) {
    const sold = soldByMenuItem.get(line.menuItemId) ?? 0;
    const base = toBaseQuantity(toNum(line.quantity), line.unit) * sold;
    expected.set(line.ingredientId, (expected.get(line.ingredientId) ?? 0) + base);
  }

  // Actual issued, keyed by ingredient via that branch's stock rows.
  const issuedByStockItem = new Map(issues.map((i) => [i.itemId, toNum(i._sum.quantity ?? 0)]));

  return ingredients
    .map((ing) => {
      const exp = round2(expected.get(ing.id) ?? 0);
      const actual = round2(ing.stockItems.reduce((s, si) => s + (issuedByStockItem.get(si.id) ?? 0), 0));
      const costPerUnit = ing.stockItems.length ? toNum(ing.stockItems[0].costPerUnit) : 0;
      const variance = round2(actual - exp);
      return {
        ingredientId: ing.id,
        name: ing.name,
        baseUnit: ing.baseUnit,
        expected: exp,
        actual,
        variance,
        // Birr value of the gap — what the over-issue is worth.
        varianceValue: round2(variance * costPerUnit),
      };
    })
    .filter((r) => r.expected > 0 || r.actual > 0)
    .sort((a, b) => Math.abs(b.varianceValue) - Math.abs(a.varianceValue));
}
