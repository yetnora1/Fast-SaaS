import { handler, ok, fail } from "@/lib/api";
import { requireSession, hashPassword } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});

export const POST = handler(async (req: Request) => {
  const me = await requireSession();
  const db = me.tenantId ? tenantDb(me.tenantId) : prisma;

  const body = await req.json();
  const { currentPassword, newPassword } = schema.parse(body);

  const user = await db.user.findUnique({
    where: { id: me.sub },
  });

  if (!user || !user.passwordHash) {
    return fail("User not found or has no password set", 400);
  }

  // Verify current password
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    return fail("Incorrect current password", 400);
  }

  // Hash and save new password
  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: me.sub },
    data: { passwordHash: newHash },
  });

  return ok({ message: "Password updated successfully" });
});
