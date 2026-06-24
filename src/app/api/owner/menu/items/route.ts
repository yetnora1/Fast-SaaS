import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";

const modifierSchema = z.object({ groupName: z.string(), option: z.string(), extraPrice: z.number().default(0) });
const schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  nameAm: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().default(0),
  vatApplicable: z.boolean().default(true),
  course: z.enum(["starter", "main", "dessert", "drink"]).default("main"),
  station: z.enum(["BARISTA", "KITCHEN"]).default("KITCHEN"),
  prepTargetSec: z.number().int().default(300),
  imageUrl: z.string().optional(),
  featured: z.boolean().default(false),
  modifiers: z.array(modifierSchema).default([]),
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const body = schema.parse(await req.json());

  // Verify the category belongs to this tenant (tenant-scoped read).
  const cat = await tenantDb(me.tenantId).menuCategory.findFirst({ where: { id: body.categoryId } });
  if (!cat) return fail("Category not found", 404);

  const item = await prisma.menuItem.create({
    data: {
      categoryId: body.categoryId,
      name: body.name,
      nameAm: body.nameAm,
      description: body.description,
      price: body.price,
      cost: body.cost,
      vatApplicable: body.vatApplicable,
      course: body.course,
      station: body.station,
      prepTargetSec: body.prepTargetSec,
      imageUrl: body.imageUrl,
      featured: body.featured,
      state: "DRAFT",
      modifiers: { create: body.modifiers },
    },
    include: { modifiers: true },
  });
  return ok(item);
});
