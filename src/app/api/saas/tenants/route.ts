import { z } from "zod";
import { handler, ok, clientIp } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole, hashPassword } from "@/lib/auth/server";
import { config } from "@/lib/config";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/integrations/email";

export const GET = handler(async (req: Request) => {
  await requireRole("saas_owner");
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const take = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
  const skip = Number(url.searchParams.get("offset") ?? 0);

  const where = q ? { name: { contains: q } } : {};
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({ where, take, skip, orderBy: { createdAt: "desc" }, include: { _count: { select: { users: true, branches: true } } } }),
    prisma.tenant.count({ where }),
  ]);
  return ok({ tenants, total, take, skip });
});

const createSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  phone: z.string().optional(),
  branchCount: z.number().int().min(1).default(1),
  address: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const me = await requireRole("saas_owner");
  const body = createSchema.parse(await req.json());
  const email = body.ownerEmail.toLowerCase().trim();

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + config.subscription.trialDays);
  const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: body.businessName, status: "active", trialEnd, phone: body.phone, address: body.address, branchCount: body.branchCount },
    });
    const owner = await tx.user.create({
      data: { tenantId: tenant.id, name: body.ownerName, email, role: "cafe_owner", passwordHash: await hashPassword(tempPassword), emailVerified: new Date() },
    });
    await tx.tenant.update({ where: { id: tenant.id }, data: { ownerUserId: owner.id } });
    const branch = await tx.branch.create({ data: { tenantId: tenant.id, name: "Main Branch", address: body.address } });
    await tx.user.update({ where: { id: owner.id }, data: { branchId: branch.id } });
    return { tenant, owner };
  });

  await sendEmail({ to: email, subject: "Your CafeFlow account", html: `<p>Welcome! Temp password: <b>${tempPassword}</b>. Trial: ${config.subscription.trialDays} days.</p>` });
  await audit({ userId: me.sub, tenantId: result.tenant.id, action: "saas.tenant.create", entity: "tenant", entityId: result.tenant.id, ip: clientIp(req), meta: { name: body.businessName } });
  return ok({ tenantId: result.tenant.id, tempPassword });
});
