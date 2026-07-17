import { prisma } from "@/lib/db/client";
import { vatFromInclusive, round2 } from "@/lib/money";
import { notifyRoleInBranch } from "./notifications";
import { getBill } from "./orders";
import type { PaymentMethod, OrderStatus } from "@prisma/client";

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
    const order = await tx.order.findUnique({ where: { id: opts.orderId }, include: { items: true } });
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

    const attemptCount = await tx.paymentAttempt.count({ where: { orderId: opts.orderId } });
    const currentAttempt = attemptCount + 1;

    await tx.paymentAttempt.create({
      data: {
        orderId: opts.orderId,
        method: opts.method,
        status: opts.confirmNow ? "SUCCESS" : "PENDING",
        providerRef: opts.reference,
        attemptNumber: currentAttempt,
      },
    });

    // Pay-last flow: payment settles the bill at the end. A confirmed payment
    // completes a fully delivered order; paying earlier just records the payment
    // and the order completes on final delivery (see recomputeOrderStatus).
    const activeItems = order.items.filter((i) => i.status !== "VOIDED" && i.status !== "REJECTED");
    const allDelivered = activeItems.length > 0 && activeItems.every((i) => i.status === "DELIVERED");

    let nextStatus: OrderStatus;
    if (!opts.confirmNow) nextStatus = "PAYMENT_PENDING";
    else if (allDelivered) nextStatus = "COMPLETED";
    else nextStatus = order.status; // paid before full delivery — keep the kitchen state

    if (nextStatus !== order.status) {
      await tx.order.update({ where: { id: opts.orderId }, data: { status: nextStatus } });

      await tx.orderStateLog.create({
        data: {
          orderId: opts.orderId,
          fromStatus: order.status,
          toStatus: nextStatus,
          actor: opts.cashierId ?? "system",
          reason: !opts.confirmNow
            ? `Digital payment initialized (attempt ${currentAttempt})`
            : `Payment successful (attempt ${currentAttempt})`,
        },
      });
    }

    if (nextStatus === "COMPLETED" && order.tableId) {
      await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }

    return { payment, changeDue };
  });
}

/** Record payment failure, check retry threshold limits */
export async function recordPaymentFailure(orderId: string, method: PaymentMethod, reason: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");

  return prisma.$transaction(async (tx) => {
    const attemptCount = await tx.paymentAttempt.count({ where: { orderId } });
    const currentAttempt = attemptCount + 1;

    await tx.paymentAttempt.create({
      data: {
        orderId,
        method,
        status: "FAILED",
        attemptNumber: currentAttempt,
        reason,
      },
    });

    let nextStatus: OrderStatus = "PAYMENT_FAILED";
    let logReason = `Payment failed (attempt ${currentAttempt}): ${reason}`;

    if (currentAttempt >= 3) {
      nextStatus = "BILL_REQUESTED";
      logReason = `Max payment attempts (${currentAttempt}) reached. Falling back to manual cashier billing.`;
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });

    await tx.orderStateLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: nextStatus,
        actor: "system",
        reason: logReason,
      },
    });

    return { nextStatus };
  });
}

/** Confirm a pending digital payment (called by Telebirr/CBE webhooks). */
export async function confirmPaymentByReference(reference: string) {
  const payment = await prisma.payment.findFirst({ where: { reference, status: "PENDING" } });
  if (!payment) return null;

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({ where: { id: payment.id }, data: { status: "CONFIRMED", verifiedAt: new Date() } });
    const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
    if (!order) throw new Error("Order not found");

    // Pay-last flow: a fully delivered order completes; otherwise restore the
    // item-derived kitchen state (the order was parked in PAYMENT_PENDING while
    // the digital payment settled).
    const activeItems = order.items.filter((i) => i.status !== "VOIDED" && i.status !== "REJECTED");
    const allDelivered = activeItems.length > 0 && activeItems.every((i) => i.status === "DELIVERED");
    let nextStatus: OrderStatus;
    if (allDelivered) {
      nextStatus = "COMPLETED";
    } else {
      const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === "READY" || i.status === "DELIVERED");
      const anyStarted = activeItems.some((i) => ["ACCEPTED", "PREPARING", "PLATING", "READY", "DELIVERED"].includes(i.status));
      nextStatus = allReady ? "READY" : anyStarted ? "PREPARING" : "CONFIRMED";
    }

    await tx.order.update({ where: { id: payment.orderId }, data: { status: nextStatus } });
    if (nextStatus === "COMPLETED" && order.tableId) {
      await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "available" } });
    }

    // Log success attempt
    const attemptCount = await tx.paymentAttempt.count({ where: { orderId: payment.orderId } });
    await tx.paymentAttempt.create({
      data: {
        orderId: payment.orderId,
        method: payment.method,
        status: "SUCCESS",
        providerRef: reference,
        attemptNumber: attemptCount + 1,
      },
    });

    await tx.orderStateLog.create({
      data: {
        orderId: payment.orderId,
        fromStatus: order.status,
        toStatus: nextStatus,
        actor: "system",
        reason: "Digital payment confirmed by reference webhook",
      },
    });

    return { p, order, nextStatus };
  });

  if (result.nextStatus === "COMPLETED") {
    await notifyRoleInBranch(result.order.branchId, "waiter", "payment_complete", "Payment received", "Table is now free.");
  } else if (result.order.waiterId) {
    const { notifyUser } = await import("./notifications");
    await notifyUser(result.order.waiterId, "order_paid", "Order paid", "Digital payment received — bill settled.");
  }
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
  if (["COMPLETED", "CANCELLED", "DECLINED"].includes(order.status)) {
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

    if (["DRAFT", "SUBMITTED", "AWAITING_PAYMENT", "PENDING_REVIEW"].includes(order.status)) {
      await tx.order.update({ where: { id: opts.orderId }, data: { status: "CONFIRMED", submittedAt: new Date() } });
      if (order.tableId) await tx.cafeTable.update({ where: { id: order.tableId }, data: { status: "occupied" } });

      await tx.orderStateLog.create({
        data: {
          orderId: opts.orderId,
          fromStatus: order.status,
          toStatus: "CONFIRMED",
          actor: opts.cashierId,
          reason: "Cashier approved prepaid receipt, order sent to kitchen",
        },
      });
    }

    return { payment, order };
  });
}
