import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/api";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  department: z.enum(["BARISTA", "KITCHEN", "SHARED"]),
  quantity: z.number().int().min(0, "Quantity must be ≥ 0"),
  condition: z.enum(["NEW", "GOOD", "WORN", "NEEDS_REPAIR", "RETIRED"]).optional(),
  storageArea: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  lastMaintenance: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/equipment — list equipment with optional filters.
 * Supports ?department=&category=&condition=&search=
 * Always tenant-scoped, manager/owner only.
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const url = new URL(req.url);

  const department = url.searchParams.get("department") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const condition = url.searchParams.get("condition") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: any = {
    tenantId: me.tenantId,
    isActive: true,
  };

  if (department) where.department = department;
  if (category) where.category = category;
  if (condition) where.condition = condition;

  // Fuzzy search: case-insensitive contains on name AND notes (OR between fields).
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.equipmentItem.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok({ items });
});

/**
 * POST /api/equipment — create a new equipment item.
 * Manager/owner only, tenant-scoped.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const body = CreateSchema.parse(await req.json());

  const item = await prisma.equipmentItem.create({
    data: {
      tenantId: me.tenantId,
      name: body.name,
      category: body.category,
      department: body.department as any,
      quantity: body.quantity,
      condition: (body.condition as any) ?? "NEW",
      storageArea: body.storageArea ?? null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      lastMaintenance: body.lastMaintenance ? new Date(body.lastMaintenance) : null,
      notes: body.notes ?? null,
      createdBy: me.sub,
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });

  await audit({
    tenantId: me.tenantId,
    userId: me.sub,
    action: "equipment.create",
    entity: "EquipmentItem",
    entityId: item.id,
    meta: { name: item.name, category: item.category, department: item.department },
    ip: clientIp(req),
  });

  return ok({ item }, { status: 201 });
});
