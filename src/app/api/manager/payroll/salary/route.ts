import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

/**
 * GET  — List all employees with their current (latest) salary config.
 * POST — Set/update salary for an employee. Manager cannot set owner salary.
 */

export const GET = handler(async () => {
  const me = await requireTenant("cafe_manager");
  const db = tenantDb(me.tenantId);

  // Get all users except the owner, with their latest salary config
  const users = await db.user.findMany({
    where: { role: { not: "cafe_owner" }, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branch: { select: { id: true, name: true } },
      salaryConfigs: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          id: true,
          grossSalary: true,
          effectiveFrom: true,
          createdAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const employees = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branch: u.branch,
    currentSalary: u.salaryConfigs[0]
      ? {
          id: u.salaryConfigs[0].id,
          grossSalary: Number(u.salaryConfigs[0].grossSalary),
          effectiveFrom: u.salaryConfigs[0].effectiveFrom,
        }
      : null,
  }));

  return ok({ employees });
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager");
  const db = tenantDb(me.tenantId);

  const body = await req.json();
  const { userId, grossSalary } = body as {
    userId: string;
    grossSalary: number;
  };

  if (!userId || grossSalary == null || grossSalary < 0) {
    return fail("userId and a non-negative grossSalary are required", 422);
  }

  // Verify the target is not the owner
  const target = await db.user.findFirst({
    where: { id: userId },
    select: { role: true },
  });
  if (!target) return fail("Employee not found", 404);
  if (target.role === "cafe_owner") return fail("Cannot set salary for the owner", 403);

  const config = await db.salaryConfig.create({
    data: {
      userId,
      grossSalary,
      effectiveFrom: new Date(),
      createdBy: me.sub,
    },
  });

  return ok({ config: { ...config, grossSalary: Number(config.grossSalary) } });
});
