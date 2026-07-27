import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { notifySaasOwners } from "@/lib/services/notifications";
import { SUPPORT_ROLES, threadScope } from "@/lib/services/support";

/**
 * GET — the inbox.
 *
 * Platform owner: every tenant's threads, each carrying its cafe name so the
 * list reads "who is this from" at a glance. Cafe owner: only their own.
 */
export const GET = handler(async (req: Request) => {
  const me = await requireRole(...SUPPORT_ROLES);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const tenantId = url.searchParams.get("tenantId");

  const scope = threadScope(me);
  const threads = await prisma.supportThread.findMany({
    where: {
      ...scope,
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      // Only the platform may narrow by tenant; for a cafe owner the scope above
      // already pins tenantId, and spreading this after it would be a hole.
      ...(me.role === "saas_owner" && tenantId ? { tenantId } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    relationLoadStrategy: "join",
    select: {
      id: true, subject: true, category: true, status: true,
      openedByName: true, lastMessageAt: true, createdAt: true,
      unreadForPlatform: true, unreadForCafe: true,
      tenant: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, authorName: true, authorRole: true } },
    },
  });

  return ok({
    threads: threads.map(({ messages, _count, ...t }) => ({
      ...t,
      messageCount: _count.messages,
      preview: messages[0] ?? null,
    })),
    // Lets the platform inbox offer a "filter by cafe" without a second call.
    tenants: me.role === "saas_owner"
      ? await prisma.tenant.findMany({ where: { supportThreads: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : [],
  });
});

const CreateSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(140),
  category: z.enum(["PROBLEM", "MODIFICATION", "QUESTION", "BILLING"]).default("PROBLEM"),
  body: z.string().trim().min(1, "Message cannot be empty").max(5000),
});

/**
 * POST — a cafe owner opens a thread.
 *
 * Deliberately cafe_owner only: the platform owner answers threads, it does not
 * start them, and no other staff role may contact the platform at all.
 */
export const POST = handler(async (req: Request) => {
  // requireTenant, not requireRole: a thread must have a cafe behind it, and
  // this guarantees tenantId is present rather than asserting it away.
  const me = await requireTenant("cafe_owner");
  const input = CreateSchema.parse(await req.json().catch(() => ({})));

  // The cafe name is never taken from the client — it comes from the session's
  // tenant, so a thread can only ever be attributed to the cafe that sent it.
  const tenantId = me.tenantId;

  const thread = await prisma.supportThread.create({
    data: {
      tenantId,
      subject: input.subject,
      category: input.category,
      openedById: me.sub,
      openedByName: me.name,
      unreadForPlatform: true,
      unreadForCafe: false,
      messages: {
        create: { authorId: me.sub, authorName: me.name, authorRole: me.role, body: input.body },
      },
    },
    include: { tenant: { select: { name: true } } },
  });

  await notifySaasOwners(
    "support",
    `New support message from ${thread.tenant.name}`,
    `${input.subject} — ${input.body.slice(0, 160)}`,
  );

  return ok({ thread: { id: thread.id } }, { status: 201 });
});
