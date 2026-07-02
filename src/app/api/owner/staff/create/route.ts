import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant, hashPassword } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email format"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  role: z.enum(["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"]),
  branchId: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const body = schema.parse(await req.json());

  // Check if email already in use
  const existing = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
  });

  if (existing) {
    return fail("Email is already registered", 400);
  }

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: {
      tenantId: me.tenantId,
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: body.role,
      branchId: body.branchId === "unassigned" ? null : body.branchId,
      active: true,
      emailVerified: new Date(),
    },
  });

  await audit({
    userId: me.sub,
    tenantId: me.tenantId,
    action: "owner.staff.create",
    entity: "user",
    entityId: user.id,
    meta: { role: body.role },
  });

  return ok({ user });
});
