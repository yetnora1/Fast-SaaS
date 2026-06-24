import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { audit } from "@/lib/audit";

const schema = z.object({ role: z.enum(["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"]), branchId: z.string().optional() });

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner");
  const body = schema.parse(await req.json());
  const db = tenantDb(me.tenantId);
  const target = await db.user.findFirst({ where: { id: params.id } });
  if (!target) return fail("Not found", 404);
  const updated = await db.user.update({ where: { id: params.id }, data: { role: body.role, branchId: body.branchId ?? target.branchId } });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "owner.staff.role", entity: "user", entityId: params.id, meta: { role: body.role } });
  return ok({ id: updated.id, role: updated.role });
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_owner");
  const db = tenantDb(me.tenantId);
  const target = await db.user.findFirst({ where: { id: params.id } });
  if (!target) return fail("Not found", 404);
  await db.user.update({ where: { id: params.id }, data: { active: false } }); // soft-deactivate
  return ok({ deactivated: true });
});
