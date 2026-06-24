import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { notifyRoleInBranch } from "@/lib/services/notifications";

const schema = z.object({ itemId: z.string().min(1), branchId: z.string().min(1), quantity: z.number().positive() });

export const POST = handler(async (req: Request) => {
  const me = await requireRole("cafe_manager", "cafe_owner", "barista", "kitchen");
  if (!me.tenantId) return fail("No tenant", 400);
  const body = schema.parse(await req.json());
  const reqRow = await tenantDb(me.tenantId).restockRequest.create({
    data: { tenantId: me.tenantId, itemId: body.itemId, branchId: body.branchId, quantity: body.quantity, requestedBy: me.sub },
  });
  await notifyRoleInBranch(body.branchId, "store_manager", "restock_request", "Restock requested", "A restock request was submitted.");
  return ok(reqRow);
});
