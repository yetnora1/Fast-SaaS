import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { receiveStock } from "@/lib/services/inventory";
import { audit } from "@/lib/audit";

const schema = z.object({ quantity: z.number().positive(), invoiceRef: z.string().optional(), costPerUnit: z.number().optional() });

export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  // costPerUnit was accepted by the schema but never passed through, so the
  // price the store typed was silently discarded. Wiring it re-values the item
  // and flows straight into every recipe that uses it.
  const res = await receiveStock({
    itemId: params.id,
    quantity: body.quantity,
    reason: body.invoiceRef ?? "delivery",
    userId: me.sub,
    unitCost: body.costPerUnit,
  });
  await audit({
    userId: me.sub, tenantId: me.tenantId, action: "store.inventory.receive",
    entity: "inventory_item", entityId: params.id,
    meta: { quantity: body.quantity, unitCost: body.costPerUnit, costAfter: res.costAfter },
  });
  return ok({ after: res.after, costPerUnit: res.costAfter });
});
