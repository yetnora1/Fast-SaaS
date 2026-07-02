import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/integrations/email";
import type { Role } from "@prisma/client";

export async function notifyUser(userId: string, type: string, title: string, body: string) {
  const n = await prisma.notification.create({ data: { userId, type, title, body } });
  return n;
}

/** Notify everyone with a given role in a branch (e.g. waiter ready alerts). */
export async function notifyRoleInBranch(branchId: string, role: Role, type: string, title: string, body: string) {
  const users = await prisma.user.findMany({ where: { branchId, role, active: true } });
  await Promise.all(users.map((u) => notifyUser(u.id, type, title, body)));
}

export async function notifyTenantOwner(tenantId: string, type: string, title: string, body: string) {
  const owner = await prisma.user.findFirst({ where: { tenantId, role: "cafe_owner", active: true } });
  if (owner) {
    await notifyUser(owner.id, type, title, body);
    await sendEmail({ to: owner.email, subject: title, html: `<p>${body}</p>` });
  }
}
