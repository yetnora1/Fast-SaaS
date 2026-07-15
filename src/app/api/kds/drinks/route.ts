import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// Barista KDS: active drink order items grouped by order.
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("barista", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const orders = await prisma.order.findMany({
    where: {
      tenantId: me.tenantId,
      ...(branchId ? { branchId } : {}),
      status: { in: ["CONFIRMED", "PREPARING", "READY"] },
      items: { some: { station: "BARISTA", status: { notIn: ["DELIVERED", "VOIDED"] } } },
    },
    include: { items: { where: { station: "BARISTA" }, include: { menuItem: true } }, table: true },
    orderBy: { submittedAt: "asc" },
  });
  return ok({ orders });
});
