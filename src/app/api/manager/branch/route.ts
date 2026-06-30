import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

/**
 * GET active branch details for the logged-in staff member.
 */
export const GET = handler(async () => {
  const me = await requireTenant("cafe_manager", "waiter", "cashier", "barista", "kitchen");
  if (!me.branchId) {
    // If manager has no branchId assigned, fallback to their first branch
    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: me.tenantId },
      select: { id: true, name: true },
    });
    if (!firstBranch) return fail("No branch found for tenant", 404);
    return ok({ branch: firstBranch });
  }
  
  const branch = await prisma.branch.findUnique({
    where: { id: me.branchId },
    select: { id: true, name: true },
  });
  if (!branch) return fail("Branch not found", 404);
  return ok({ branch });
});
