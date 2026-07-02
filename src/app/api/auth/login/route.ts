import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { loginWithPassword } from "@/lib/auth/server";
import { audit } from "@/lib/audit";
import { ROLE_HOME } from "@/lib/auth/roles";
import { limitPublic } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = handler(async (req: Request) => {
  // Brute-force guard: 10 attempts per IP per minute.
  const limited = limitPublic(req, "login", 10, 60_000);
  if (limited) return limited;
  const body = schema.parse(await req.json());
  const session = await loginWithPassword(body.email, body.password);
  if (!session) return fail("Invalid credentials", 401);
  await audit({ tenantId: session.tenantId, userId: session.sub, action: "auth.login", ip: clientIp(req) });
  return ok({ role: session.role, home: ROLE_HOME[session.role], name: session.name });
});
