import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { OrderStatus } from "@prisma/client";

const LIVE: OrderStatus[] = [
  OrderStatus.SUBMITTED,
  OrderStatus.IN_PREPARATION,
  OrderStatus.PARTIALLY_READY,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.BILL_REQUESTED,
  OrderStatus.PAYMENT_PENDING,
];

export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const orders = await prisma.order.findMany({
    where: { tenantId: me.tenantId, ...(branchId ? { branchId } : {}), status: { in: LIVE } },
    include: { items: { include: { menuItem: true } }, table: true, waiter: { select: { name: true } } },
    orderBy: { submittedAt: "asc" },
  });
  return ok({ orders });
});
