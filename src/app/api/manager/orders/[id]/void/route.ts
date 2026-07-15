import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import bcrypt from "bcryptjs";
import { voidOrder } from "@/lib/services/orders";
import { audit } from "@/lib/audit";

const schema = z.object({ pin: z.string().length(4), reason: z.string().min(2) });

// Void requires Manager 4-digit PIN + mandatory reason (spec §3.3).
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("cafe_manager", "cafe_owner");
  let json;
  try {
    json = await req.json();
  } catch {
    return fail("Invalid request body JSON", 400);
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    console.error("Void order validation failed:", result.error.flatten());
    return fail(`Validation failed: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")}`, 422);
  }
  const body = result.data;

  const manager = await prisma.user.findUnique({ where: { id: me.sub } });
  if (!manager?.pinHash || !(await bcrypt.compare(body.pin, manager.pinHash))) return fail("Invalid PIN", 403);

  await voidOrder(params.id, body.reason, me.sub);
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "manager.order.void", entity: "order", entityId: params.id, ip: clientIp(req), meta: { reason: body.reason } });
  return ok({ voided: true });
});
