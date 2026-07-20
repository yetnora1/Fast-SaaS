import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// QR self-orders awaiting waiter confirmation (status DRAFT + type QR).
export const GET = handler(async () => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  // If the customer picked a specific on-duty waiter, that order goes ONLY to them.
  // Orders with no chosen waiter ("Any available") stay visible to every waiter.
  // Managers/owners still see all drafts for oversight.
  const waiterScope = me.role === "waiter" ? { OR: [{ waiterId: null }, { waiterId: me.sub }] } : {};
  const orders = await prisma.order.findMany({
    where: { tenantId: me.tenantId, type: "QR", status: "DRAFT", ...(me.branchId ? { branchId: me.branchId } : {}), ...waiterScope },
    // waiter = the on-duty waiter the customer requested at checkout, if any.
    include: { items: { include: { menuItem: true } }, table: true, waiter: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return ok({ orders });
});
