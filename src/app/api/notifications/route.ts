import { handler, ok } from "@/lib/api";
import { requireSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

export const GET = handler(async () => {
  const me = await requireSession();
  const notifications = await prisma.notification.findMany({ where: { userId: me.sub }, orderBy: { createdAt: "desc" }, take: 30 });
  const unread = notifications.filter((n) => !n.read).length;
  return ok({ notifications, unread });
});

export const POST = handler(async () => {
  // Mark all as read.
  const me = await requireSession();
  await prisma.notification.updateMany({ where: { userId: me.sub, read: false }, data: { read: true } });
  return ok({ marked: true });
});
