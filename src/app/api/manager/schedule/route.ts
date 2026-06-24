import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Week window (Mon..Sun, UTC) containing `ref`. UTC keeps it aligned with @db.Date. */
function weekRange(ref: Date) {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  const from = new Date(d);
  from.setUTCDate(d.getUTCDate() - day);
  const to = new Date(from);
  to.setUTCDate(from.getUTCDate() + 6);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

// Weekly schedule for a branch (spec §3.4).
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId;
  if (!branchId) return fail("branchId required", 400);

  // Ownership: branch must belong to my tenant (tenantDb injects tenantId).
  const branch = await tenantDb(me.tenantId).branch.findFirst({ where: { id: branchId } });
  if (!branch) return fail("Branch not found", 404);

  const fromParam = url.searchParams.get("from");
  const { from, to } = fromParam ? weekRange(new Date(fromParam)) : weekRange(new Date());

  const [schedules, staff] = await Promise.all([
    prisma.staffSchedule.findMany({
      where: { branchId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { shiftStart: "asc" }],
      include: { user: { select: { id: true, name: true, role: true } } },
    }),
    tenantDb(me.tenantId).user.findMany({
      where: { branchId, active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return ok({ schedules, staff, from, to, branchId });
});

const createSchema = z.object({
  userId: z.string().min(1),
  branchId: z.string().min(1),
  date: z.string().min(1),
  shiftStart: z.string().regex(TIME),
  shiftEnd: z.string().regex(TIME),
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const body = createSchema.parse(await req.json());
  if (body.shiftEnd <= body.shiftStart) return fail("Shift end must be after start", 400);

  const db = tenantDb(me.tenantId);
  const [branch, user] = await Promise.all([
    db.branch.findFirst({ where: { id: body.branchId } }),
    db.user.findFirst({ where: { id: body.userId } }),
  ]);
  if (!branch) return fail("Branch not found", 404);
  if (!user) return fail("Staff member not found", 404);

  const date = new Date(body.date);
  // Conflict detection: overlapping shift for same staff on same day (spec §3.4).
  const sameDay = await prisma.staffSchedule.findMany({ where: { userId: body.userId, date } });
  const overlaps = sameDay.some((s) => body.shiftStart < s.shiftEnd && s.shiftStart < body.shiftEnd);
  if (overlaps) return fail("Staff already has an overlapping shift that day", 409);

  const schedule = await prisma.staffSchedule.create({
    data: { userId: body.userId, branchId: body.branchId, date, shiftStart: body.shiftStart, shiftEnd: body.shiftEnd },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  return ok(schedule);
});