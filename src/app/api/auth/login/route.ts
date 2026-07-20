import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { loginWithPassword } from "@/lib/auth/server";
import { audit } from "@/lib/audit";
import { ROLE_HOME } from "@/lib/auth/roles";
import { limitPublic } from "@/lib/rate-limit";

// Accept `identifier` (email OR username); `email` kept for backward compatibility.
const schema = z
  .object({ identifier: z.string().min(1).optional(), email: z.string().min(1).optional(), password: z.string().min(1) })
  .refine((b) => b.identifier || b.email, { message: "Email or username is required" });

export const POST = handler(async (req: Request) => {
  // Brute-force guard: 10 attempts per IP per minute.
  const limited = limitPublic(req, "login", 10, 60_000);
  if (limited) return limited;
  const body = schema.parse(await req.json());
  const session = await loginWithPassword((body.identifier ?? body.email)!, body.password);
  if (!session) return fail("Invalid credentials", 401);
  // The session cookie is already set — never let an audit-log write failure
  // (e.g. a transient DB blip) turn a successful login into a 500.
  try {
    await audit({ tenantId: session.tenantId, userId: session.sub, action: "auth.login", ip: clientIp(req) });
  } catch (e) {
    console.error("login audit failed (non-fatal):", e);
  }
  return ok({ role: session.role, home: ROLE_HOME[session.role], name: session.name });
});
