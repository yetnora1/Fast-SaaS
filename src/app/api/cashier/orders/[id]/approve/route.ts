import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { cashierApproveOrder } from "@/lib/services/orders";
import { audit } from "@/lib/audit";

/** POST — cashier approves a PENDING_CASHIER order, firing it to kitchen/barista. */
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  try {
    await cashierApproveOrder(params.id);
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.order.approve", entity: "order", entityId: params.id });
    return ok({ approved: true });
  } catch (e) {
    return fail((e as Error).message, 400);
  }
});
