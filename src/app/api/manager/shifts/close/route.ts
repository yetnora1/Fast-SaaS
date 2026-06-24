import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { closeShift } from "@/lib/services/shifts";
import { audit } from "@/lib/audit";

const schema = z.object({ shiftId: z.string().min(1), actualCash: z.number().nonnegative() });

export const POST = handler(async (req: Request) => {
  const me = await requireRole("cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  try {
    const result = await closeShift(body.shiftId, body.actualCash);
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "manager.shift.close", entity: "shift", entityId: body.shiftId, meta: { variance: result.variance } });
    return ok(result);
  } catch (e) {
    return fail((e as Error).message, 400);
  }
});
