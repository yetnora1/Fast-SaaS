import { z } from "zod";
import crypto from "crypto";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { config } from "@/lib/config";
import { sendEmail } from "@/lib/integrations/email";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"]),
  branchId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const body = schema.parse(await req.json());
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.invitation.create({
    data: { tenantId: me.tenantId, email: body.email.toLowerCase(), role: body.role, branchId: body.branchId, token, expiresAt },
  });
  const link = `${config.authUrl}/invite/${token}`;
  await sendEmail({ to: body.email, subject: "You're invited to CafeFlow", html: `<p>Set your password: <a href="${link}">${link}</a></p>` });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "owner.staff.invite", entity: "invitation", entityId: invite.id, meta: { role: body.role } });
  return ok({ invitationId: invite.id, link });
});
