import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { loginWithPin } from "@/lib/auth/server";
import { audit } from "@/lib/audit";
import { ROLE_HOME } from "@/lib/auth/roles";

const schema = z.object({ branchId: z.string().min(1), pin: z.string().length(4) });

export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
  const session = await loginWithPin(body.branchId, body.pin);
  if (!session) return fail("Invalid PIN", 401);
  await audit({ tenantId: session.tenantId, userId: session.sub, action: "auth.pin_login", ip: clientIp(req) });
  return ok({ role: session.role, home: ROLE_HOME[session.role], name: session.name });
});
