import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

/**
 * GET — Owner view: fetch payroll records for a given month/year (all employees).
 * Query params: ?month=7&year=2026
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const db = tenantDb(me.tenantId);

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");

  if (!month || !year) {
    return fail("month and year query params required", 422);
  }

  const records = await db.payrollRecord.findMany({
    where: { month, year },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  // Also get salary configs for read-only view
  const salaryConfigs = await db.salaryConfig.findMany({
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate configs: latest per user
  const latestConfigMap = new Map<string, typeof salaryConfigs[0]>();
  for (const cfg of salaryConfigs) {
    if (!latestConfigMap.has(cfg.userId)) {
      latestConfigMap.set(cfg.userId, cfg);
    }
  }

  const formatted = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    userRole: r.user.role,
    branchName: r.user.branch?.name ?? "—",
    month: r.month,
    year: r.year,
    grossSalary: Number(r.grossSalary),
    totalDays: r.totalDays,
    workedDays: Number(r.workedDays),
    absentDays: Number(r.absentDays),
    earnedSalary: Number(r.earnedSalary),
    pension: Number(r.pension),
    taxableIncome: Number(r.taxableIncome),
    incomeTax: Number(r.incomeTax),
    netSalary: Number(r.netSalary),
    status: r.status,
  }));

  const configs = Array.from(latestConfigMap.values()).map((c) => ({
    userId: c.userId,
    userName: c.user.name,
    userRole: c.user.role,
    grossSalary: Number(c.grossSalary),
    effectiveFrom: c.effectiveFrom,
  }));

  return ok({ records: formatted, salaryConfigs: configs });
});
