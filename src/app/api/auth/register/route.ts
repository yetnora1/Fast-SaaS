import { z } from "zod";
import { handler, ok, fail, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/server";
import { config } from "@/lib/config";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/integrations/email";

const schema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  address: z.string().optional(),
});

/** Cafe Owner self-registration → creates tenant + owner + 7-day trial. */
export const POST = handler(async (req: Request) => {
  const body = schema.parse(await req.json());
  const email = body.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("Email already registered", 409);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + config.subscription.trialDays);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: body.businessName, status: "active", trialEnd, address: body.address, phone: body.phone },
    });
    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: body.ownerName,
        email,
        passwordHash: await hashPassword(body.password),
        role: "cafe_owner",
        emailVerified: new Date(), // dev: auto-verify; wire real verification in prod
      },
    });
    await tx.tenant.update({ where: { id: tenant.id }, data: { ownerUserId: owner.id } });
    const branch = await tx.branch.create({ data: { tenantId: tenant.id, name: "Main Branch", address: body.address } });
    await tx.user.update({ where: { id: owner.id }, data: { branchId: branch.id } });
    return { tenant, owner };
  });

  await audit({ tenantId: result.tenant.id, userId: result.owner.id, action: "tenant.register", entity: "tenant", entityId: result.tenant.id, ip: clientIp(req) });
  await sendEmail({ to: email, subject: "Welcome to CafeFlow", html: `<p>Your ${config.subscription.trialDays}-day free trial has started.</p>` });

  return ok({ tenantId: result.tenant.id });
});
