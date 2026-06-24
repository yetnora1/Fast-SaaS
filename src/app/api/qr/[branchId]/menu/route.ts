import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db/client";

// Public customer-facing menu for QR self-ordering (no auth).
export const GET = handler(async (_req: Request, { params }: { params: { branchId: string } }) => {
  const branch = await prisma.branch.findUnique({ where: { id: params.branchId } });
  if (!branch) return ok({ categories: [] });
  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: branch.tenantId, active: true },
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { state: "PUBLISHED", available: true }, include: { modifiers: true } } },
  });
  return ok({ branch: { id: branch.id, name: branch.name, tenantId: branch.tenantId }, categories });
});
