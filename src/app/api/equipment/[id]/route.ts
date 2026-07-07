import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/api";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  department: z.enum(["BARISTA", "KITCHEN", "SHARED"]).optional(),
  quantity: z.number().int().min(0).optional(),
  condition: z.enum(["NEW", "GOOD", "WORN", "NEEDS_REPAIR", "RETIRED"]).optional(),
  storageArea: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  lastMaintenance: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * PUT /api/equipment/:id — update an equipment item.
 * Manager/owner only, same tenant.
 */
export const PUT = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const body = UpdateSchema.parse(await req.json());

  const existing = await prisma.equipmentItem.findUnique({ where: { id: params.id } });
  if (!existing || existing.tenantId !== me.tenantId || !existing.isActive) {
    return fail("Equipment not found", 404);
  }

  const data: any = { ...body };
  if (body.purchaseDate !== undefined) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (body.lastMaintenance !== undefined) data.lastMaintenance = body.lastMaintenance ? new Date(body.lastMaintenance) : null;

  const item = await prisma.equipmentItem.update({
    where: { id: params.id },
    data,
    include: { creator: { select: { id: true, name: true } } },
  });

  await audit({
    tenantId: me.tenantId,
    userId: me.sub,
    action: "equipment.update",
    entity: "EquipmentItem",
    entityId: item.id,
    meta: { changes: Object.keys(body) },
    ip: clientIp(req),
  });

  return ok({ item });
});

/**
 * DELETE /api/equipment/:id — soft delete (set isActive = false).
 * Manager/owner only, same tenant.
 */
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");

  const existing = await prisma.equipmentItem.findUnique({ where: { id: params.id } });
  if (!existing || existing.tenantId !== me.tenantId || !existing.isActive) {
    return fail("Equipment not found", 404);
  }

  await prisma.equipmentItem.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  await audit({
    tenantId: me.tenantId,
    userId: me.sub,
    action: "equipment.delete",
    entity: "EquipmentItem",
    entityId: params.id,
    meta: { name: existing.name },
    ip: clientIp(req),
  });

  return ok({ deleted: true });
});
