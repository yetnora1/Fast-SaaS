import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { shiftTotals } from "@/lib/services/shifts";

export const GET = handler(async (req: Request) => {
  const me = await requireRole("cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const shift = await prisma.shift.findFirst({ where: { branchId, status: "OPEN" } });
  if (!shift) return ok(null);
  const totals = await shiftTotals(shift.id);
  return ok({ shift, totals });
});
