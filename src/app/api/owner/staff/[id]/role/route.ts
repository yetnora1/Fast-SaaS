import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { audit } from "@/lib/audit";

const schema = z.object({
  role: z.enum(["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"]).optional(),
  branchId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner");
  const body = schema.parse(await req.json());
  const db = tenantDb(me.tenantId);
  const target = await db.user.findFirst({ where: { id: params.id } });
  if (!target) return fail("Not found", 404);

  const updateData: any = {};
  if (body.role !== undefined) updateData.role = body.role;
  if (body.branchId !== undefined) updateData.branchId = body.branchId;
  if (body.active !== undefined) updateData.active = body.active;

  const updated = await db.user.update({
    where: { id: params.id },
    data: updateData,
  });

  await audit({
    userId: me.sub,
    tenantId: me.tenantId,
    action: "owner.staff.update",
    entity: "user",
    entityId: params.id,
    meta: updateData,
  });

  return ok({ id: updated.id, role: updated.role, active: updated.active, branchId: updated.branchId });
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner");
  const db = tenantDb(me.tenantId);
  const target = await db.user.findFirst({ where: { id: params.id } });
  if (!target) return fail("Not found", 404);
  await db.user.update({ where: { id: params.id }, data: { active: false } }); // soft-deactivate
  return ok({ deactivated: true });
});
