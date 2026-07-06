import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { approveReceiptPayment } from "@/lib/services/payments";
import { voidOrder } from "@/lib/services/orders";
import { notifyRoleInBranch } from "@/lib/services/notifications";
import { audit } from "@/lib/audit";

const schema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["approve", "decline"]),
  reason: z.string().max(300).optional(),
});

/**
 * Cashier reviews a customer payment receipt and either approves it (records a
 * confirmed payment and releases the order to the kitchen) or declines it (the
 * order is cancelled/voided). Owners and managers may review as well.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const { orderId, decision, reason } = schema.parse(await req.json());

  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId: me.tenantId } });
  if (!order) return fail("Order not found", 404);
  if (["COMPLETED", "VOIDED", "REFUNDED"].includes(order.status)) {
    return fail("This order has already been settled or cancelled", 409);
  }

  if (decision === "approve") {
    const shift = me.branchId ? await prisma.shift.findFirst({ where: { branchId: me.branchId, status: "OPEN" } }) : null;
    try {
      const { payment } = await approveReceiptPayment({ orderId, cashierId: me.sub, shiftId: shift?.id });
      await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.receipt.approve", entity: "order", entityId: orderId, meta: { paymentId: payment.id } });
      await notifyRoleInBranch(order.branchId, "waiter", "payment_approved", "Payment approved", "A customer's payment receipt was approved — order sent to the kitchen.");
      return ok({ approved: true, orderId });
    } catch (e) {
      return fail((e as Error).message, 409);
    }
  }

  // Decline → cancel the order.
  await voidOrder(orderId, reason?.trim() || "Payment receipt declined by cashier", me.sub);
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.receipt.decline", entity: "order", entityId: orderId, meta: { reason: reason ?? null } });
  await notifyRoleInBranch(order.branchId, "waiter", "payment_declined", "Payment declined", "A customer's payment receipt was declined — the order was cancelled.");
  return ok({ declined: true, orderId });
});
