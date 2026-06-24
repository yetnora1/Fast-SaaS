import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  name: z.string().optional(),
  nameAm: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  vatApplicable: z.boolean().optional(),
  available: z.boolean().optional(),
  course: z.enum(["starter", "main", "dessert", "drink"]).optional(),
  station: z.enum(["BARISTA", "KITCHEN"]).optional(),
  imageUrl: z.string().nullable().optional(),
  featured: z.boolean().optional(),
});

async function ownsItem(tenantId: string, itemId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, include: { category: true } });
  return item && item.category.tenantId === tenantId ? item : null;
}

export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  if (!(await ownsItem(me.tenantId, params.id))) return fail("Not found", 404);
  const body = schema.parse(await req.json());
  const item = await prisma.menuItem.update({ where: { id: params.id }, data: body });
  return ok(item);
});

export const PATCH = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  // toggle availability
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const existing = await ownsItem(me.tenantId, params.id);
  if (!existing) return fail("Not found", 404);
  const item = await prisma.menuItem.update({ where: { id: params.id }, data: { available: !existing.available } });
  return ok(item);
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  if (!(await ownsItem(me.tenantId, params.id))) return fail("Not found", 404);
  // Block hard-delete when the item appears in order history (FK = restrict);
  // the owner can mark it unavailable instead to retire it.
  const orders = await prisma.orderItem.count({ where: { menuItemId: params.id } });
  if (orders > 0) return fail("This item has past orders — mark it unavailable instead of deleting.", 409);
  await prisma.menuItem.delete({ where: { id: params.id } }); // modifiers cascade
  return ok({ deleted: true });
});
