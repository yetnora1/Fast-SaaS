import { handler, ok, fail } from "@/lib/api";
import { requireSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  username: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  bio: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
});

// 3–20 chars, starts alphanumeric, then letters/numbers/dot/underscore/hyphen.
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;

export const GET = handler(async () => {
  const me = await requireSession();
  const db = me.tenantId ? tenantDb(me.tenantId) : prisma;

  const user = await db.user.findUnique({
    where: { id: me.sub },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
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

  // Username is optional and self-chosen. undefined = leave unchanged; ""/null =
  // clear it; otherwise validate format and enforce global uniqueness.
  let usernamePatch: { username?: string | null } = {};
  if (data.username !== undefined) {
    const u = (data.username ?? "").trim().toLowerCase();
    if (u === "") {
      usernamePatch = { username: null };
    } else {
      if (!USERNAME_RE.test(u)) {
        return fail("Username must be 3–20 characters: start with a letter or number, then letters, numbers, dot, underscore or hyphen.", 422);
      }
      // Global check — usernames are unique across all tenants (login has no tenant context).
      const clash = await prisma.user.findFirst({ where: { username: u, NOT: { id: me.sub } }, select: { id: true } });
      if (clash) return fail("That username is already taken.", 409);
      usernamePatch = { username: u };
    }
  }

  const updated = await db.user.update({
    where: { id: me.sub },
    data: {
      name: data.name,
      phone: data.phone || null,
      age: data.age || null,
      bio: data.bio || null,
      emergencyContact: data.emergencyContact || null,
      ...usernamePatch,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
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
