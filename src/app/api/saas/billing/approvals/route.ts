import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";

export const GET = handler(async () => {
  await requireRole("saas_owner");
  const pending = await prisma.subscription.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { tenant: { select: { id: true, name: true } } },
  });
  return ok({ pending });
});
