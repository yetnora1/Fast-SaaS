import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { notifySaasOwners, notifyTenantOwner } from "@/lib/services/notifications";
import { SUPPORT_ROLES, getAccessibleThread } from "@/lib/services/support";

const BodySchema = z.object({ body: z.string().trim().min(1, "Message cannot be empty").max(5000) });

/** POST — append a reply. Both sides of the conversation may post. */
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireRole(...SUPPORT_ROLES);
  const thread = await getAccessibleThread(me, params.id);
  if (!thread) return fail("Thread not found", 404);
  if (thread.status === "RESOLVED" && me.role !== "saas_owner") {
    return fail("This thread is resolved. Open a new one to continue.", 409);
  }

  const { body } = BodySchema.parse(await req.json().catch(() => ({})));
  const fromPlatform = me.role === "saas_owner";

  // One transaction so a reply can never land without moving the thread's sort
  // key and unread flag — otherwise a message could sit invisible at the bottom
  // of the other side's inbox.
  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { threadId: thread.id, authorId: me.sub, authorName: me.name, authorRole: me.role, body },
      select: { id: true, authorName: true, authorRole: true, body: true, createdAt: true },
    }),
    prisma.supportThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        // Flag the side that did NOT just write.
        unreadForPlatform: !fromPlatform,
        unreadForCafe: fromPlatform,
        // A cafe replying to a resolved-then-reopened thread puts it back in play.
        ...(fromPlatform ? {} : { status: thread.status === "RESOLVED" ? thread.status : "OPEN" }),
      },
    }),
  ]);

  // Each side gets a link into its own view of the same conversation.
  if (fromPlatform) {
    await notifyTenantOwner(
      thread.tenantId, "support", "Reply from CafeFlow support",
      body.slice(0, 200), `/owner/support?thread=${thread.id}`,
    );
  } else {
    await notifySaasOwners(
      "support", `${thread.tenant.name}: ${thread.subject}`,
      body.slice(0, 200), `/saas-admin/support?thread=${thread.id}`,
    );
  }

  return ok({ message }, { status: 201 });
});
