import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { SUPPORT_ROLES, getAccessibleThread, markRead, sideOf } from "@/lib/services/support";

/** GET — one thread with its full conversation. Marks it read for whoever asked. */
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole(...SUPPORT_ROLES);
  const thread = await getAccessibleThread(me, params.id);
  if (!thread) return fail("Thread not found", 404);

  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, authorId: true, authorName: true, authorRole: true, body: true, createdAt: true },
  });

  // Opening a thread clears only the reader's own badge.
  await markRead(thread.id, sideOf(me));

  return ok({
    thread: {
      id: thread.id,
      subject: thread.subject,
      category: thread.category,
      status: thread.status,
      openedByName: thread.openedByName,
      createdAt: thread.createdAt,
      lastMessageAt: thread.lastMessageAt,
      tenant: thread.tenant,
    },
    messages,
  });
});

const PatchSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]) });

/**
 * PATCH — change thread status. Platform owner only: the cafe raises the issue,
 * the platform decides when it is being worked on or done.
 */
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole("saas_owner");
  const thread = await getAccessibleThread(me, params.id);
  if (!thread) return fail("Thread not found", 404);

  const { status } = PatchSchema.parse(await req.json().catch(() => ({})));
  await prisma.supportThread.update({
    where: { id: thread.id },
    // A status change is news for the cafe, so re-flag their side.
    data: { status, unreadForCafe: true },
  });

  return ok({ status });
});
