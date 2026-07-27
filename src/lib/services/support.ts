import { prisma } from "@/lib/db/client";
import { AuthError } from "@/lib/auth/server";
import type { SessionClaims } from "@/lib/auth/session";

/**
 * Support threads connect exactly two parties: the cafe owner who raised the
 * thread and the platform (SaaS) owner who answers it. Managers, waiters,
 * cashiers and the rest of the staff have no access at all.
 */
export const SUPPORT_ROLES = ["cafe_owner", "saas_owner"] as const;

/** Which side of the conversation a session is on. */
export type SupportSide = "cafe" | "platform";

export function sideOf(session: SessionClaims): SupportSide {
  return session.role === "saas_owner" ? "platform" : "cafe";
}

/**
 * Scope filter for listing threads.
 *
 * The platform owner sees every tenant's threads — that is the whole point of
 * the inbox. A cafe owner sees only their own tenant's, enforced here rather
 * than trusting a tenantId supplied by the client.
 */
export function threadScope(session: SessionClaims) {
  if (session.role === "saas_owner") return {};
  if (!session.tenantId) throw new AuthError("FORBIDDEN");
  return { tenantId: session.tenantId };
}

/**
 * Load a thread the session is actually allowed to see, or throw. Returning 403
 * (rather than 404) for someone else's thread is deliberate: the id is a cuid,
 * so there is nothing to enumerate, and a clear error is easier to debug.
 */
export async function getAccessibleThread(session: SessionClaims, threadId: string) {
  const thread = await prisma.supportThread.findUnique({
    where: { id: threadId },
    include: { tenant: { select: { id: true, name: true } } },
  });
  if (!thread) return null;
  if (session.role !== "saas_owner" && thread.tenantId !== session.tenantId) {
    throw new AuthError("FORBIDDEN");
  }
  return thread;
}

/**
 * Mark a thread read for the side that is currently looking at it. Each side has
 * its own flag so the platform opening a thread never clears the cafe's badge.
 */
export async function markRead(threadId: string, side: SupportSide) {
  await prisma.supportThread.update({
    where: { id: threadId },
    data: side === "platform" ? { unreadForPlatform: false } : { unreadForCafe: false },
  });
}
