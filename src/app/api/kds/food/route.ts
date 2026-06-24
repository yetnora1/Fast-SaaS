import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// Kitchen KDS: active food order items grouped by order, with allergy flags.
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("kitchen", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const orders = await prisma.order.findMany({
    where: {
      tenantId: me.tenantId,
      ...(branchId ? { branchId } : {}),
      status: { in: ["SUBMITTED", "IN_PREPARATION", "PARTIALLY_READY", "READY"] },
      items: { some: { station: "KITCHEN", status: { notIn: ["DELIVERED", "VOIDED"] } } },
    },
    include: { items: { where: { station: "KITCHEN" }, include: { menuItem: true } }, table: true },
    orderBy: { submittedAt: "asc" },
  });
  return ok({ orders });
});
