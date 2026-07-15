import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Wrap a route handler with uniform error handling. */
export function handler<T extends (...args: any[]) => Promise<Response>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (e) {
      // Let Next's static-render bailout (from cookies()/headers()) propagate.
      if (e && typeof e === "object" && (e as any).digest === "DYNAMIC_SERVER_USAGE") throw e;
      if (e instanceof AuthError) {
        return fail(e.code, e.code === "UNAUTHENTICATED" ? 401 : 403);
      }
      if (e instanceof ZodError) {
        return fail("Validation failed", 422, { issues: e.flatten() });
      }
      console.error("[api] unhandled", e);
      return fail("Internal server error", 500);
    } finally {
      // Keep prisma connection pooled for performance and concurrent transactions
      // if (process.env.NODE_ENV === "production") {
      //   await prisma.$disconnect().catch((err) => console.error("Prisma disconnect failed", err));
      // }
    }
  }) as T;
}

export function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  return xf ? xf.split(",")[0].trim() : null;
}
