import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db/client";

// Public: waiters currently ON DUTY at this branch, for the QR self-order screen.
// "On duty" = an open attendance record (clockOut null) — exactly what the staff
// clock-in/out marks. Never cached: duty status changes as staff clock in and out,
// and the customer's page polls this every few seconds so the list stays live.
export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, { params }: { params: { branchId: string } }) => {
  const branch = await prisma.branch.findUnique({ where: { id: params.branchId }, select: { id: true } });
  if (!branch) return ok({ waiters: [] });

  const waiters = await prisma.user.findMany({
    where: {
      branchId: branch.id,
      role: "waiter",
      active: true,
      attendance: { some: { clockOut: null } }, // currently clocked in
    },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return ok({ waiters });
});
