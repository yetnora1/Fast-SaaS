import { handler, ok, fail } from "@/lib/api";
import { requireSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  phone: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  bio: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
});

export const GET = handler(async () => {
  const me = await requireSession();
  const db = me.tenantId ? tenantDb(me.tenantId) : prisma;

  const user = await db.user.findUnique({
    where: { id: me.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      age: true,
      bio: true,
      avatarUrl: true,
      emergencyContact: true,
      salaryConfigs: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          grossSalary: true,
        },
      },
    },
  });

  if (!user) return fail("User not found", 404);
  const { salaryConfigs, ...rest } = user;
  const formatted = {
    ...rest,
    grossSalary: salaryConfigs[0] ? Number(salaryConfigs[0].grossSalary) : null,
  };
  return ok({ user: formatted });
});

export const PATCH = handler(async (req: Request) => {
  const me = await requireSession();
  const db = me.tenantId ? tenantDb(me.tenantId) : prisma;

  const body = await req.json();
  const data = profileSchema.parse(body);

  const updated = await db.user.update({
    where: { id: me.sub },
    data: {
      name: data.name,
      phone: data.phone || null,
      age: data.age || null,
      bio: data.bio || null,
      emergencyContact: data.emergencyContact || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      age: true,
      bio: true,
      avatarUrl: true,
      emergencyContact: true,
    },
  });

  return ok({ user: updated });
});
