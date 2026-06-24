import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./server";
import { checkSubscriptionStatus } from "@/lib/subscription";
import type { SessionClaims } from "./session";
import type { SubscriptionStatus } from "@/lib/subscription";

/**
 * Server-side subscription gate for tenant route-group layouts.
 * (Middleware enforces auth+RBAC; this enforces the DB-backed subscription state
 * that Prisma cannot evaluate in the Edge runtime.)
 *
 * EXPIRED/SUSPENDED → redirect to /subscription/gate (full lockout).
 * Returns the session + status so layouts can render WARNING/GRACE banners.
 */
export async function guardTenant(): Promise<{ session: SessionClaims; status: SubscriptionStatus }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.tenantId) {
    // cafe roles must have a tenant; saas owner shouldn't be here
    redirect("/login");
  }
  const status = await checkSubscriptionStatus(session.tenantId);
  if (status.locked) redirect("/subscription/gate");
  return { session, status };
}
