import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// Floor-layout edits (drag-to-move, shape, seat count, rotation) are a
// manager/owner privilege; waiters get a read-only floor + tap-to-order.
const schema = z.object({
  xPos: z.number().finite().optional(),
  yPos: z.number().finite().optional(),
  rotation: z.number().finite().optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  shape: z.enum(["round", "square", "rectangle", "booth"]).optional(),
  status: z.enum(["available", "occupied", "attention", "dirty"]).optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const data = schema.parse(await req.json());
  if (Object.keys(data).length === 0) return fail("Nothing to update", 400);

  // Tenant-scope the edit: the table's branch must belong to my tenant.
  const table = await prisma.cafeTable.findUnique({
    where: { id: params.id },
    include: { branch: { select: { tenantId: true } } },
  });
  if (!table || table.branch.tenantId !== me.tenantId) return fail("Not found", 404);

  const updated = await prisma.cafeTable.update({ where: { id: params.id }, data });
  return ok({ table: updated });
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const table = await prisma.cafeTable.findUnique({
    where: { id: params.id },
    include: {
      branch: { select: { tenantId: true } },
      orders: { where: { status: { notIn: ["COMPLETED", "VOIDED", "REFUNDED"] } }, select: { id: true } },
    },
  });
  if (!table || table.branch.tenantId !== me.tenantId) return fail("Not found", 404);
  if (table.orders.length > 0) return fail("Table has active orders — clear them before removing.", 409);

  // Detach historical orders (keeps their records) then remove the table.
  await prisma.$transaction([
    prisma.order.updateMany({ where: { tableId: table.id }, data: { tableId: null } }),
    prisma.cafeTable.delete({ where: { id: table.id } }),
  ]);
  return ok({ deleted: true });
});
