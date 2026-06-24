import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

const schema = z.object({ name: z.string().min(1).optional(), nameAm: z.string().nullable().optional() });

async function ownsCategory(tenantId: string, id: string) {
  const cat = await prisma.menuCategory.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
  return cat && cat.tenantId === tenantId ? cat : null;
}

export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  if (!(await ownsCategory(me.tenantId, params.id))) return fail("Not found", 404);
  const body = schema.parse(await req.json());
  const cat = await prisma.menuCategory.update({ where: { id: params.id }, data: body });
  return ok(cat);
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const cat = await ownsCategory(me.tenantId, params.id);
  if (!cat) return fail("Not found", 404);
  if (cat._count.items > 0) return fail("Category is not empty — remove its items first.", 409);
  await prisma.menuCategory.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});
