import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { rolesForPath } from "@/lib/auth/roles";

/**
 * Edge middleware: authentication + role-based route protection (server-side).
 *
 * NOTE on the subscription gate: the spec calls a DB stored procedure inside
 * middleware. Prisma cannot run in the Edge runtime, so the SUBSCRIPTION gate is
 * enforced one layer in — in the tenant route-group layout (src/app/(tenant)/layout.tsx),
 * which runs in Node and calls checkSubscriptionStatus(). Middleware still guards
 * authentication + RBAC for every protected route.
 */

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/saas-admin/login",
  "/subscription/gate",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/qr") || // customer QR self-order is public
    pathname.startsWith("/api/qr") || // customer QR API is public
    pathname.includes(".")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const requiredRoles = rolesForPath(pathname);
  // API routes do their own auth via requireRole(); only guard page routes here.
  const isApi = pathname.startsWith("/api");

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isApi) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    const loginUrl = pathname.startsWith("/saas-admin") ? "/saas-admin/login" : "/login";
    const url = new URL(loginUrl, req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (requiredRoles && !requiredRoles.includes(session.role)) {
    if (isApi) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
