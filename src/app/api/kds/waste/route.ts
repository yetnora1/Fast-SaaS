import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { applyMovement } from "@/lib/services/inventory";

const schema = z.object({ itemId: z.string().optional(), quantity: z.number().positive(), reason: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("barista", "kitchen", "cafe_manager", "cafe_owner", "store_manager");
  const body = schema.parse(await req.json());
  const log = await tenantDb(me.tenantId).wasteLog.create({
    data: { tenantId: me.tenantId, itemId: body.itemId, quantity: body.quantity, reason: body.reason, userId: me.sub },
  });
  // Reduce stock if linked to an inventory item.
  if (body.itemId) {
    try {
      await applyMovement({ itemId: body.itemId, type: "WASTE", quantity: body.quantity, reason: body.reason, userId: me.sub });
    } catch {
      return fail("Waste logged but stock not adjusted (item not in inventory)", 200);
    }
  }
  return ok(log);
});
