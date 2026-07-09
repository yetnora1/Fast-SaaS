import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

/**
 * GET — Fetch payroll records for a given month/year.
 * Query params: ?month=7&year=2026
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager");
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

  return ok({ records: formatted });
});
