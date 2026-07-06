import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { lineTotal } from "@/lib/money";

/**
 * Pending customer-receipt payments awaiting cashier review.
 *
 * QR self-orders are prepaid by bank/wallet transfer: the customer uploads a
 * receipt at checkout. Those orders surface here — carrying a receipt, not yet
 * settled by a CONFIRMED payment, and not cancelled/completed — so the cashier
 * can verify the receipt and approve (release to kitchen) or decline (cancel).
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;

  const orders = await prisma.order.findMany({
    where: {
      tenantId: me.tenantId,
      ...(branchId ? { branchId } : {}),
      receiptUrl: { not: null },
      status: { notIn: ["COMPLETED", "VOIDED", "REFUNDED"] },
      payments: { none: { status: "CONFIRMED" } },
    },
    include: {
      table: true,
      items: { where: { status: { not: "VOIDED" } }, include: { menuItem: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const pending = orders.map((o) => {
    const items = o.items.map((i) => {
      const extras = Array.isArray(i.modifiersJson)
        ? (i.modifiersJson as any[]).reduce((s, m) => s + (Number(m.extraPrice) || 0), 0)
        : 0;
      return { name: i.menuItem.name, qty: i.quantity, lineTotal: lineTotal(i.unitPrice, i.quantity, extras) };
    });
    return {
      orderId: o.id,
      table: o.table?.number ?? null,
      status: o.status,
      txRef: o.txRef,
      receiptUrl: o.receiptUrl,
      createdAt: o.createdAt,
      items,
      total: items.reduce((s, l) => s + l.lineTotal, 0),
    };
  });

  return ok({ orders: pending });
});
