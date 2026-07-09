import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";

/**
 * POST — Owner approves a batch of payroll records for a given month/year.
 * Changes status from PROCESSED → APPROVED.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const db = tenantDb(me.tenantId);

  const body = await req.json();
  const { month, year } = body as { month: number; year: number };

  if (!month || !year) {
    return fail("month and year are required", 422);
  }

  const result = await db.payrollRecord.updateMany({
    where: { month, year, status: "PROCESSED" },
    data: { status: "APPROVED", approvedBy: me.sub },
  });

  return ok({ approved: result.count, month, year });
});
