import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { notifyUser } from "@/lib/services/notifications";

const schema = z.object({ branchId: z.string().min(1), from: z.string().optional() });

// Publish DRAFT schedules for a branch → notify affected staff (spec §3.4).
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());

  const branch = await tenantDb(me.tenantId).branch.findFirst({ where: { id: body.branchId } });
  if (!branch) return fail("Branch not found", 404);

  const drafts = await prisma.staffSchedule.findMany({ where: { branchId: body.branchId, status: "DRAFT" } });
  if (drafts.length === 0) return ok({ published: 0 });

  await prisma.staffSchedule.updateMany({
    where: { id: { in: drafts.map((d) => d.id) } },
    data: { status: "PUBLISHED" },
  });

  const userIds = Array.from(new Set(drafts.map((d) => d.userId)));
  await Promise.all(
    userIds.map((uid) => notifyUser(uid, "schedule_published", "Schedule published", "Your shift schedule has been updated.")),
  );

  return ok({ published: drafts.length, notified: userIds.length });
});