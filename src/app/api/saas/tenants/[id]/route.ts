import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { audit } from "@/lib/audit";
import { checkSubscriptionStatus } from "@/lib/subscription";

export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireRole("saas_owner");
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, active: true, branchId: true } },
      branches: true,
      subscriptions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!tenant) return fail("Not found", 404);
  const status = await checkSubscriptionStatus(tenant.id);
  return ok({ tenant, status });
});

const DeleteSchema = z.object({
  /** The tenant's exact name, retyped. Verified server-side, not just in the UI. */
  confirmName: z.string(),
});

/**
 * DELETE — permanently remove a cafe and everything it owns.
 *
 * This is not the soft `terminate` action: nothing is retained and there is no
 * undo. Guarded three ways — saas_owner only, the exact name must be retyped,
 * and the audit entry is written BEFORE the rows disappear (audit_logs.tenant_id
 * is SET NULL on delete, so the record survives the cafe it describes).
 *
 * Five foreign keys are RESTRICT and would abort a bare tenant.delete():
 *
 *   po_items.inventory_item_id  -> inventory_items
 *   order_items.menu_item_id    -> menu_items
 *   equipment_items.created_by  -> users
 *   goods_issues.issued_by_id   -> users
 *   shifts.opened_by            -> users
 *
 * Postgres does not promise to unwind cascades in an order that satisfies them,
 * so those five are cleared explicitly first, inside the same transaction. The
 * remaining ~40 relations cascade from the tenant row.
 */
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  const { confirmName } = DeleteSchema.parse(await req.json().catch(() => ({})));

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, _count: { select: { users: true, branches: true, orders: true } } },
  });
  if (!tenant) return fail("Cafe not found", 404);

  if (confirmName.trim() !== tenant.name) {
    return fail(`Type the cafe's exact name ("${tenant.name}") to confirm removal`, 422);
  }

  // Written first: once the cascade runs, there is nothing left to describe.
  await audit({
    userId: me.sub,
    tenantId: tenant.id,
    action: "saas.tenant.delete",
    entity: "tenant",
    entityId: tenant.id,
    meta: {
      name: tenant.name,
      users: tenant._count.users,
      branches: tenant._count.branches,
      orders: tenant._count.orders,
    },
    ip: clientIp(req),
  });

  await prisma.$transaction(
    async (tx) => {
      // 1. The five RESTRICT children, deepest first.
      await tx.purchaseOrderItem.deleteMany({ where: { po: { tenantId: tenant.id } } });
      await tx.orderItem.deleteMany({ where: { order: { tenantId: tenant.id } } });
      await tx.goodsIssue.deleteMany({ where: { tenantId: tenant.id } });
      await tx.equipmentItem.deleteMany({ where: { tenantId: tenant.id } });
      await tx.shift.deleteMany({ where: { branch: { tenantId: tenant.id } } });

      // 2. Everything else cascades from here.
      await tx.tenant.delete({ where: { id: tenant.id } });
    },
    // A busy cafe's history is a lot of rows over a remote connection; the 5s
    // default would abort midway and roll the whole thing back.
    { timeout: 60_000, maxWait: 10_000 },
  );

  return ok({ deleted: true, name: tenant.name });
});
