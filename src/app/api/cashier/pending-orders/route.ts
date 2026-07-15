import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

/** GET pending-cashier orders for the cashier approval queue. */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const orders = await prisma.order.findMany({
    where: {
      tenantId: me.tenantId,
      ...(branchId ? { branchId } : {}),
      status: "PENDING_REVIEW",
    },
    include: {
      table: true,
      waiter: { select: { name: true } },
      items: { include: { menuItem: { select: { name: true, nameAm: true, price: true, station: true } } } },
      riskFlags: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return ok({ orders });
});
