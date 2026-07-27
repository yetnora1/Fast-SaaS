import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum } from "@/lib/money";
import { inferBaseUnit } from "@/lib/services/recipe-costing";

const ROLES = ["cafe_owner", "cafe_manager"] as const;

/** GET — the catalog, each entry with the per-branch prices a recipe would use. */
export const GET = handler(async () => {
  const me = await requireTenant(...ROLES);

  const [ingredients, unlinked] = await Promise.all([
    prisma.ingredient.findMany({
      where: { tenantId: me.tenantId },
      orderBy: { name: "asc" },
      relationLoadStrategy: "join",
      select: {
        id: true, name: true, nameAm: true, baseUnit: true,
        stockItems: {
          select: { id: true, branchId: true, costPerUnit: true, quantity: true, branch: { select: { name: true } } },
        },
        _count: { select: { recipeLines: true } },
      },
    }),
    // Stock rows not yet mapped to a catalog entry — offered as import candidates.
    prisma.inventoryItem.findMany({
      where: { tenantId: me.tenantId, ingredientId: null },
      select: { id: true, name: true, unit: true, costPerUnit: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return ok({
    ingredients: ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      nameAm: i.nameAm,
      baseUnit: i.baseUnit,
      usedInRecipes: i._count.recipeLines,
      branches: i.stockItems.map((s) => ({
        branchId: s.branchId,
        branchName: s.branch.name,
        costPerUnit: toNum(s.costPerUnit),
        quantity: toNum(s.quantity),
      })),
    })),
    // Deduplicated by name: the same ingredient is usually stocked in each branch.
    importable: [...new Map(unlinked.map((u) => [u.name.toLowerCase(), {
      name: u.name, unit: u.unit, baseUnit: inferBaseUnit(u.unit), costPerUnit: toNum(u.costPerUnit),
    }])).values()],
  });
});

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  nameAm: z.string().trim().max(80).optional(),
  baseUnit: z.enum(["KG", "L", "PIECE"]),
});

/**
 * POST — add a catalog entry and adopt any matching stock rows.
 *
 * Linking by name across branches is what lets one recipe price itself from
 * each branch's own shelf. Names are matched case-insensitively because the
 * store may have typed "sugar" in one branch and "Sugar" in another.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireTenant(...ROLES);
  const input = CreateSchema.parse(await req.json().catch(() => ({})));

  const existing = await prisma.ingredient.findFirst({
    where: { tenantId: me.tenantId, name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return fail("An ingredient with that name already exists", 409);

  const ingredient = await prisma.ingredient.create({
    data: { tenantId: me.tenantId, name: input.name, nameAm: input.nameAm || null, baseUnit: input.baseUnit },
  });

  const adopted = await prisma.inventoryItem.updateMany({
    where: { tenantId: me.tenantId, ingredientId: null, name: { equals: input.name, mode: "insensitive" } },
    data: { ingredientId: ingredient.id },
  });

  return ok({ ingredient, linkedStockRows: adopted.count }, { status: 201 });
});
