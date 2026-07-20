import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { config, COOKIE_NAME } from "@/lib/config";
import { createSessionToken, verifySessionToken, type SessionClaims } from "./session";

/** Read & verify the current session from the cookie (server components / routes). */
export async function getSession(): Promise<SessionClaims | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionClaims> {
  const s = await getSession();
  if (!s) throw new AuthError("UNAUTHENTICATED");
  return s;
}

export async function requireRole(...roles: Role[]): Promise<SessionClaims> {
  const s = await requireSession();
  if (!roles.includes(s.role)) throw new AuthError("FORBIDDEN");
  return s;
}

/** Tenant-scoped session — guarantees a tenantId is present (cafe roles). */
export async function requireTenant(...roles: Role[]): Promise<SessionClaims & { tenantId: string }> {
  const s = roles.length ? await requireRole(...roles) : await requireSession();
  if (!s.tenantId) throw new AuthError("FORBIDDEN");
  return s as SessionClaims & { tenantId: string };
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

async function setCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: config.sessionTtlHours * 3600,
  });
}

export async function clearSession() {
  cookies().delete(COOKIE_NAME);
}

/**
 * Look up the login user, retrying through transient DB connectivity blips (the
 * shared Postgres instance occasionally refuses/drops connections) so they don't
 * surface to the user as a 500 on the login screen.
 */
async function findLoginUser(id: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.user.findFirst({ where: { OR: [{ email: id }, { username: id }] } });
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      const code = (e as { code?: string })?.code ?? "";
      const transient =
        name === "PrismaClientInitializationError" ||
        name === "PrismaClientRustPanicError" ||
        code === "P1001" || // can't reach database server
        code === "P1017"; // server has closed the connection
      if (!transient || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
}

/** Email/username + password login. Returns claims on success, null on failure. */
export async function loginWithPassword(identifier: string, password: string): Promise<SessionClaims | null> {
  const id = identifier.toLowerCase().trim();
  // Accept either the account email or the user's self-chosen username.
  const user = await findLoginUser(id);
  if (!user || !user.active || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  // Block login if the tenant is suspended/terminated.
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || tenant.status !== "active") return null;
  }

  const claims = toClaims(user);
  await setCookie(await createSessionToken(claims));
  return claims;
}

/** PIN + branch quick login for POS tablets. */
export async function loginWithPin(branchId: string, pin: string): Promise<SessionClaims | null> {
  const users = await prisma.user.findMany({
    where: { branchId, active: true, pinHash: { not: null } },
  });
  const results = await Promise.all(
    users.map(async (user) => {
      if (user.pinHash && (await bcrypt.compare(pin, user.pinHash))) {
        return user;
      }
      return null;
    })
  );
  const matchedUser = results.find((u) => u !== null);
  if (matchedUser) {
    const claims = toClaims(matchedUser);
    await setCookie(await createSessionToken(claims));
    return claims;
  }
  return null;
}

function toClaims(user: {
  id: string;
  role: Role;
  tenantId: string | null;
  branchId: string | null;
  name: string;
  email: string;
}): SessionClaims {
  return {
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
    branchId: user.branchId,
    name: user.name,
    email: user.email,
  };
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}
