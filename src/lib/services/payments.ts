import { prisma } from "@/lib/db/client";
import { vatFromInclusive, round2 } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import { getBill } from "./orders";
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

/**
 * Cashier approves a customer-submitted payment receipt (QR self-order prepaid
 * by bank transfer). Records a CONFIRMED payment for the bill total and releases
 * the order into the kitchen flow if it was still awaiting confirmation. The
 * order later auto-completes on full delivery (see recomputeOrderStatus), so the
 * prepaid sale is counted as revenue. Idempotent: a second approval is rejected.
 */
export async function approveReceiptPayment(opts: {
  orderId: string;
  cashierId: string;
  shiftId?: string | null;
}) {
  const { order, total } = await getBill(opts.orderId);
  if (["COMPLETED", "VOIDED", "REFUNDED"].includes(order.status)) {
    throw new Error("Order is already settled or cancelled");
  }

  return prisma.$transaction(async (tx) => {
    const already = await tx.payment.findFirst({ where: { orderId: opts.orderId, status: "CONFIRMED" } });
    if (already) throw new Error("Payment already confirmed for this order");

    const payment = await tx.payment.create({
      data: {
        orderId: opts.orderId,
        method: "CBE_BIRR", // customer bank/wallet transfer verified from receipt
        amount: total,
        reference: order.txRef ?? undefined,
        status: "CONFIRMED",
        verifiedAt: new Date(),
        cashierId: opts.cashierId,
        shiftId: opts.shiftId ?? null,
      },
    });

    // A not-yet-confirmed order (customer paid up-front) is released to the KDS.
    if (order.status === "DRAFT") {
      await tx.order.update({ where: { id: opts.orderId }, data: { status: "SUBMITTED", submittedAt: new Date() } });
      if (order.tableId) await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "occupied" } });
    }

    return { payment, order };
  });
}
