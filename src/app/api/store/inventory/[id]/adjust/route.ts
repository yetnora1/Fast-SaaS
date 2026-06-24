import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { applyMovement } from "@/lib/services/inventory";
import { audit } from "@/lib/audit";

const schema = z.object({ delta: z.number(), reason: z.string().min(1) });

// Manual adjustment: positive delta = receive, negative = consume/adjust-down.
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const res = await applyMovement({
    itemId: params.id,
    type: body.delta >= 0 ? "RECEIVE" : "ADJUST",
    quantity: Math.abs(body.delta),
    reason: body.reason,
    userId: me.sub,
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "store.inventory.adjust", entity: "inventory_item", entityId: params.id, meta: { delta: body.delta, reason: body.reason } });
  return ok({ after: res.after });
});
