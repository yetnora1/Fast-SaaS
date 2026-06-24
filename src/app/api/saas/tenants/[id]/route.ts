import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { checkSubscriptionStatus } from "@/lib/subscription";

export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireRole("saas_owner");
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, active: true, branchId: true } },
      branches: true,
      subscriptions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!tenant) return fail("Not found", 404);
  const status = await checkSubscriptionStatus(tenant.id);
  return ok({ tenant, status });
});
