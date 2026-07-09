import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const staff = await tenantDb(me.tenantId).user.findMany({
    where: { role: { not: "cafe_owner" } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      active: true,
      phone: true,
      age: true,
      bio: true,
      avatarUrl: true,
      emergencyContact: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      salaryConfigs: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          grossSalary: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const formatted = staff.map((s) => {
    const { salaryConfigs, ...rest } = s;
    return {
      ...rest,
      grossSalary: salaryConfigs[0] ? Number(salaryConfigs[0].grossSalary) : null,
    };
  });

  return ok({ staff: formatted });
});
