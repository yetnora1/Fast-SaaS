import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

// Every staff role clocks attendance — the café owner does not track their own.
const CLOCK_ROLES = ["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"] as const;

/** My current attendance status: the open (not clocked-out) record, if any. */
export const GET = handler(async () => {
  const me = await requireTenant(...CLOCK_ROLES);
  const open = await prisma.staffAttendance.findFirst({
    where: { userId: me.sub, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  return ok({ open: open ? { id: open.id, clockIn: open.clockIn } : null });
});

/**
 * Toggle clock in/out. No open record → clock IN (new permanent daily row,
 * linked to the branch's open shift when one exists). Open record → clock OUT.
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
    return ok({ action: "OUT", clockIn: done.clockIn, clockOut: done.clockOut });
  }

  // Guard against duplicate same-moment rows (double tap) — one open row max.
  const shift = me.branchId ? await prisma.shift.findFirst({ where: { branchId: me.branchId, status: "OPEN" } }) : null;
  const rec = await prisma.staffAttendance.create({
    data: { userId: me.sub, shiftId: shift?.id ?? null },
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "attendance.clock_in", entity: "staff_attendance", entityId: rec.id });
  return ok({ action: "IN", clockIn: rec.clockIn, clockOut: null });
});
