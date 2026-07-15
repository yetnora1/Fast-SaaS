import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { cashierDeclineOrder } from "@/lib/services/orders";
import { audit } from "@/lib/audit";

const schema = z.object({ reason: z.string().min(1, "Decline reason is required") });

/** POST — cashier declines a PENDING_CASHIER order with a reason. */
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  try {
    await cashierDeclineOrder(params.id, body.reason);
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.order.decline", entity: "order", entityId: params.id });
    return ok({ declined: true });
  } catch (e) {
    return fail((e as Error).message, 400);
  }
});
