import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { round2 } from "@/lib/money";

/**
 * Attendance report for managers/owners: every clock in/out record in the
 * selected range (year / 6 months / month / week / day — the client sends
 * from/to), plus a per-staff summary (days present, total hours).
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const url = new URL(req.url);

  const from = url.searchParams.get("from") ? startOfDay(url.searchParams.get("from")!) : startOfDay(new Date().toISOString());
  const to = url.searchParams.get("to") ? endOfDay(url.searchParams.get("to")!) : endOfDay(new Date().toISOString());
  const branchId = url.searchParams.get("branchId") || undefined;
  const userId = url.searchParams.get("userId") || undefined;

  const records = await prisma.staffAttendance.findMany({
    where: {
      clockIn: { gte: from, lte: to },
      ...(userId ? { userId } : {}),
      user: {
        tenantId: me.tenantId,
        role: { not: "cafe_owner" },
        ...(branchId ? { branchId } : {}),
      },
    },
    include: { user: { select: { id: true, name: true, role: true, branch: { select: { name: true } } } } },
    orderBy: { clockIn: "desc" },
    take: 2000,
  });

  const now = Date.now();
  const rows = records.map((r) => {
    const outMs = r.clockOut ? r.clockOut.getTime() : now;
    return {
      id: r.id,
      userId: r.user.id,
      name: r.user.name,
      role: r.user.role,
      branch: r.user.branch?.name ?? null,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      hours: round2((outMs - r.clockIn.getTime()) / 3_600_000),
      open: !r.clockOut,
    };
  });

  // Per-staff summary: distinct days present + total hours in range.
  const byStaff = new Map<string, { name: string; role: string; days: Set<string>; hours: number }>();
  for (const r of rows) {
    const s = byStaff.get(r.userId) ?? { name: r.name, role: r.role, days: new Set<string>(), hours: 0 };
    s.days.add(new Date(r.clockIn).toDateString());
    s.hours += r.hours;
    byStaff.set(r.userId, s);
  }
  const summary = Array.from(byStaff.entries())
    .map(([id, s]) => ({ userId: id, name: s.name, role: s.role, daysPresent: s.days.size, totalHours: round2(s.hours) }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const openNow = rows.filter((r) => r.open).length;
  return ok({
    period: { from, to },
    rows,
    summary,
    totals: { records: rows.length, staff: summary.length, hours: round2(rows.reduce((s, r) => s + r.hours, 0)), openNow },
  });
});

function startOfDay(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(s: string) {
  const d = new Date(s);
  d.setHours(23, 59, 59, 999);
  return d;
}
