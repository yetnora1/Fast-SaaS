import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/client";
import { calculatePayroll } from "@/lib/payroll/ethiopian-tax";

/**
 * POST — Process payroll for a given month/year.
 * Counts unique attendance days per employee, calculates salary with Ethiopian tax,
 * and creates PayrollRecord entries.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager");
  const db = tenantDb(me.tenantId);

  const body = await req.json();
  const { month, year } = body as { month: number; year: number };

  if (!month || !year || month < 1 || month > 12 || year < 2020) {
    return fail("Valid month (1-12) and year are required", 422);
  }

  // Get all active employees (excluding owner) who have a salary config
  const employees = await db.user.findMany({
    where: { role: { not: "cafe_owner" }, active: true },
    select: {
      id: true,
      name: true,
      role: true,
      salaryConfigs: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: { grossSalary: true },
      },
    },
  });

  // Date range for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get all attendance records for this month
  const attendance = await prisma.staffAttendance.findMany({
    where: {
      userId: { in: employees.map((e) => e.id) },
      clockIn: { gte: startDate, lte: endDate },
    },
    select: {
      userId: true,
      clockIn: true,
    },
  });

  // Count unique worked days per employee (any clock-in = 1 full day)
  const workedDaysMap = new Map<string, Set<string>>();
  for (const record of attendance) {
    const dateKey = record.clockIn.toISOString().slice(0, 10); // "YYYY-MM-DD"
    if (!workedDaysMap.has(record.userId)) {
      workedDaysMap.set(record.userId, new Set());
    }
    workedDaysMap.get(record.userId)!.add(dateKey);
  }

  const results: Array<{
    userId: string;
    name: string;
    role: string;
    status: string;
    breakdown?: ReturnType<typeof calculatePayroll>;
    error?: string;
  }> = [];

  for (const emp of employees) {
    const salaryConfig = emp.salaryConfigs[0];
    if (!salaryConfig) {
      results.push({
        userId: emp.id,
        name: emp.name,
        role: emp.role,
        status: "skipped",
        error: "No salary configured",
      });
      continue;
    }

    const grossSalary = Number(salaryConfig.grossSalary);
    const workedDays = workedDaysMap.get(emp.id)?.size ?? 0;
    const breakdown = calculatePayroll(grossSalary, workedDays);

    try {
      await db.payrollRecord.upsert({
        where: {
          tenantId_userId_month_year: {
            tenantId: me.tenantId,
            userId: emp.id,
            month,
            year,
          },
        },
        create: {
          tenantId: me.tenantId,
          userId: emp.id,
          month,
          year,
          grossSalary: breakdown.grossSalary,
          totalDays: breakdown.totalDays,
          workedDays: breakdown.workedDays,
          absentDays: breakdown.absentDays,
          earnedSalary: breakdown.earnedSalary,
          pension: breakdown.pension,
          taxableIncome: breakdown.taxableIncome,
          incomeTax: breakdown.incomeTax,
          netSalary: breakdown.netSalary,
          status: "PROCESSED",
          processedBy: me.sub,
        },
        update: {
          grossSalary: breakdown.grossSalary,
          totalDays: breakdown.totalDays,
          workedDays: breakdown.workedDays,
          absentDays: breakdown.absentDays,
          earnedSalary: breakdown.earnedSalary,
          pension: breakdown.pension,
          taxableIncome: breakdown.taxableIncome,
          incomeTax: breakdown.incomeTax,
          netSalary: breakdown.netSalary,
          status: "PROCESSED",
          processedBy: me.sub,
        },
      });

      results.push({
        userId: emp.id,
        name: emp.name,
        role: emp.role,
        status: "processed",
        breakdown,
      });
    } catch (err) {
      results.push({
        userId: emp.id,
        name: emp.name,
        role: emp.role,
        status: "error",
        error: (err as Error).message,
      });
    }
  }

  return ok({ month, year, results });
});
