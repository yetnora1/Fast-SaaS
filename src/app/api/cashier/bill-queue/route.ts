import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const orders = await prisma.order.findMany({
    where: { tenantId: me.tenantId, ...(branchId ? { branchId } : {}), status: { in: ["BILL_REQUESTED", "PAYMENT_PENDING", "PAYMENT_FAILED"] } },
    include: { table: true, items: true },
    orderBy: { updatedAt: "asc" },
  });
  return ok({ orders });
});
