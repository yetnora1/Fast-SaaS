import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// QR self-orders awaiting waiter confirmation (status DRAFT + type QR).
export const GET = handler(async () => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const orders = await prisma.order.findMany({
    where: { tenantId: me.tenantId, type: "QR", status: "DRAFT", ...(me.branchId ? { branchId: me.branchId } : {}) },
    include: { items: { include: { menuItem: true } }, table: true },
    orderBy: { createdAt: "asc" },
  });
  return ok({ orders });
});
