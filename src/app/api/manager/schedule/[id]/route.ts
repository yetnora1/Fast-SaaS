import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const patchSchema = z.object({
  date: z.string().min(1).optional(),
  shiftStart: z.string().regex(TIME).optional(),
  shiftEnd: z.string().regex(TIME).optional(),
});

/** Load a schedule and assert it belongs to the caller's tenant (via its branch). */
async function ownedSchedule(id: string, tenantId: string) {
  const s = await prisma.staffSchedule.findUnique({ where: { id }, include: { branch: { select: { tenantId: true } } } });
  if (!s || s.branch.tenantId !== tenantId) return null;
  return s;
}

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const existing = await ownedSchedule(params.id, me.tenantId);
  if (!existing) return fail("Schedule not found", 404);

  const body = patchSchema.parse(await req.json());
  const shiftStart = body.shiftStart ?? existing.shiftStart;
  const shiftEnd = body.shiftEnd ?? existing.shiftEnd;
  if (shiftEnd <= shiftStart) return fail("Shift end must be after start", 400);

  const schedule = await prisma.staffSchedule.update({
    where: { id: params.id },
    data: { shiftStart, shiftEnd, ...(body.date ? { date: new Date(body.date) } : {}) },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  return ok(schedule);
});

export const DELETE = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const existing = await ownedSchedule(params.id, me.tenantId);
  if (!existing) return fail("Schedule not found", 404);
  await prisma.staffSchedule.delete({ where: { id: params.id } });
  return ok({ deleted: true });
});