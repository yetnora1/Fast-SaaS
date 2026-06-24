import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { openShift } from "@/lib/services/shifts";
import { audit } from "@/lib/audit";

const schema = z.object({ openingFloat: z.number().nonnegative(), branchId: z.string().optional() });

export const POST = handler(async (req: Request) => {
  const me = await requireRole("cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const branchId = body.branchId ?? me.branchId;
  if (!branchId) return fail("No branch", 400);
  try {
    const shift = await openShift(branchId, me.sub, body.openingFloat);
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "manager.shift.open", entity: "shift", entityId: shift.id });
    return ok(shift);
  } catch (e) {
    return fail((e as Error).message, 409);
  }
});
