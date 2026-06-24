import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { config, COOKIE_NAME } from "@/lib/config";

/**
 * Edge-safe JWT session layer (used by middleware AND route handlers).
 *
 * This is a lightweight, self-contained implementation of the
 * "NextAuth.js v5 — JWT + role + tenant_id in session" requirement from the spec.
 * It uses `jose` (Web Crypto) so it runs in the Edge middleware runtime.
 */

export interface SessionClaims {
  sub: string; // user id
  role: Role;
  tenantId: string | null;
  branchId: string | null;
  name: string;
  email: string;
}

const secret = new TextEncoder().encode(config.authSecret);

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.sessionTtlHours}h`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub),
      role: payload.role as Role,
      tenantId: (payload.tenantId as string | null) ?? null,
      branchId: (payload.branchId as string | null) ?? null,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
