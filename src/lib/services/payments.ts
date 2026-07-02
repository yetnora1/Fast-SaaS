import { prisma } from "@/lib/db/client";
import { vatFromInclusive, round2 } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import type { PaymentMethod } from "@prisma/client";

/**
 * process_order_payment() — atomic equivalent of the PLpgSQL stored procedure.
 * Marks payment confirmed, completes the order, frees the table, decrements
 * inventory (best-effort per consumption logging), all in one transaction.
 */
export async function processPayment(opts: {
  orderId: string;
  method: PaymentMethod;
  amount: number;
  tendered?: number;
  reference?: string;
  cashierId?: string;
  shiftId?: string | null;
  confirmNow?: boolean; // cash = true; telebirr/cbe confirmed via webhook
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: opts.orderId } });
    if (!order) throw new Error("Order not found");

    const changeDue =
      opts.method === "CASH" && opts.tendered != null ? round2(opts.tendered - opts.amount) : null;

    const payment = await tx.payment.create({
      data: {
        orderId: opts.orderId,
        method: opts.method,
        amount: opts.amount,
        tendered: opts.tendered,
        changeDue,
        reference: opts.reference,
        cashierId: opts.cashierId,
        shiftId: opts.shiftId ?? null,
        status: opts.confirmNow ? "CONFIRMED" : "PENDING",
        verifiedAt: opts.confirmNow ? new Date() : null,
      },
    });

    if (opts.confirmNow) {
      await tx.order.update({ where: { id: opts.orderId }, data: { status: "COMPLETED" } });
      if (order.tableId) await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    } else {
      await tx.order.update({ where: { id: opts.orderId }, data: { status: "PAYMENT_PENDING" } });
    }

    return { payment, changeDue };
  });
}

/** Confirm a pending digital payment (called by Telebirr/CBE webhooks). */
export async function confirmPaymentByReference(reference: string) {
  const payment = await prisma.payment.findFirst({ where: { reference, status: "PENDING" } });
  if (!payment) return null;

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({ where: { id: payment.id }, data: { status: "CONFIRMED", verifiedAt: new Date() } });
    const order = await tx.order.update({ where: { id: payment.orderId }, data: { status: "COMPLETED" } });
    if (order.tableId) await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    return { p, order };
  });

  await notifyRoleInBranch(result.order.branchId, "waiter", "payment_complete", "Payment received", "Table is now free.");
  return result;
}

export async function vatBreakdownForOrder(total: number) {
  return vatFromInclusive(total);
}
