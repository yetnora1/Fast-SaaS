import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

// Allow all roles except saas_owner (platform admin)
const CLOCK_ROLES = ["cafe_owner", "cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"] as const;

function getTodayRangeEAT() {
  const now = new Date();
  // Adjust to UTC+3 (Ethiopia Time)
  const eatOffset = 3 * 60 * 60 * 1000;
  const eatDate = new Date(now.getTime() + eatOffset);
  
  // Start of today in EAT
  const startOfTodayEAT = new Date(eatDate);
  startOfTodayEAT.setUTCHours(0, 0, 0, 0);
  const startOfTodayUTC = new Date(startOfTodayEAT.getTime() - eatOffset);
  
  // End of today in EAT
  const endOfTodayEAT = new Date(eatDate);
  endOfTodayEAT.setUTCHours(23, 59, 59, 999);
  const endOfTodayUTC = new Date(endOfTodayEAT.getTime() - eatOffset);
  
  return { start: startOfTodayUTC, end: endOfTodayUTC };
}

/** My current attendance status: the open record and completed today record, if any. */
export const GET = handler(async () => {
  const me = await requireTenant(...CLOCK_ROLES);
  
  const open = await prisma.staffAttendance.findFirst({
    where: { userId: me.sub, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  const { start, end } = getTodayRangeEAT();
  const completed = await prisma.staffAttendance.findFirst({
    where: {
      userId: me.sub,
      clockOut: { not: null },
      clockIn: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { clockIn: "desc" },
  });

  return ok({ 
    open: open ? { id: open.id, clockIn: open.clockIn } : null,
    completed: completed ? { id: completed.id, clockIn: completed.clockIn, clockOut: completed.clockOut } : null
  });
});

/**
 * Toggle clock in/out. No open record → clock IN (if not already clocked in today).
 * Open record → clock OUT.
 */
export const POST = handler(async () => {
  const me = await requireTenant(...CLOCK_ROLES);

  const open = await prisma.staffAttendance.findFirst({
    where: { userId: me.sub, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  if (open) {
    const done = await prisma.staffAttendance.update({
      where: { id: open.id },
      data: { clockOut: new Date() },
    });
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "attendance.clock_out", entity: "staff_attendance", entityId: done.id });
    return ok({ action: "OUT", open: null, completed: done });
  }

  // Guard: Check if user already clocked in today (once per 24 hour / day)
  const { start, end } = getTodayRangeEAT();
  const existingToday = await prisma.staffAttendance.findFirst({
    where: {
      userId: me.sub,
      clockIn: {
        gte: start,
        lte: end,
      },
    },
  });

  if (existingToday) {
    return fail("You have already completed your attendance today. Only one clock-in/out session is allowed per day.", 400);
  }

  // Guard against duplicate same-moment rows (double tap) — one open row max.
  const shift = me.branchId ? await prisma.shift.findFirst({ where: { branchId: me.branchId, status: "OPEN" } }) : null;
  const rec = await prisma.staffAttendance.create({
    data: { userId: me.sub, shiftId: shift?.id ?? null },
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "attendance.clock_in", entity: "staff_attendance", entityId: rec.id });
  return ok({ action: "IN", open: rec, completed: null });
});
