import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { processPayment } from "@/lib/services/payments";
import { getBill } from "@/lib/services/orders";
import { audit } from "@/lib/audit";

const splitPart = z.object({ method: z.enum(["CASH", "TELEBIRR", "CBE_BIRR"]), amount: z.number().positive(), tendered: z.number().optional(), reference: z.string().optional() });
const schema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["CASH", "TELEBIRR", "CBE_BIRR", "SPLIT"]),
  amount: z.number().positive().optional(),
  tendered: z.number().optional(),
  reference: z.string().optional(),
  parts: z.array(splitPart).optional(),
});

// Process payment. CASH confirms immediately; digital methods confirm via webhook.
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());

  try {
    const shift = me.branchId ? await prisma.shift.findFirst({ where: { branchId: me.branchId, status: "OPEN" } }) : null;
    const { total } = await getBill(body.orderId);

    if (body.method === "SPLIT") {
      if (!body.parts?.length) return fail("Split requires parts", 422);
      const sum = body.parts.reduce((s, p) => s + p.amount, 0);
      if (Math.abs(sum - total) > 0.01) return fail(`Split parts (${sum}) must equal total (${total})`, 422);
      const results = [];
      for (const part of body.parts) {
        const r = await processPayment({
          orderId: body.orderId,
          method: part.method,
          amount: part.amount,
          tendered: part.tendered,
          reference: part.reference,
          cashierId: me.sub,
          shiftId: shift?.id,
          confirmNow: part.method === "CASH",
        });
        results.push(r);
      }
      await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.payment.split", entity: "order", entityId: body.orderId });
      return ok({ split: true, results });
    }

    // Cash must be the exact bill amount — no overpayment, underpayment or change.
    if (body.method === "CASH" && (body.tendered == null || Math.abs(body.tendered - total) > 0.01)) {
      return fail(`Re-enter the exact amount: ${total.toFixed(2)} ETB`, 422);
    }

    const amount = body.amount ?? total;
    const result = await processPayment({
      orderId: body.orderId,
      method: body.method,
      amount,
      tendered: body.tendered,
      reference: body.reference,
      cashierId: me.sub,
      shiftId: shift?.id,
      confirmNow: body.method === "CASH",
    });
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "cashier.payment", entity: "order", entityId: body.orderId, meta: { method: body.method, amount } });
    return ok({ paymentId: result.payment.id, changeDue: result.changeDue, status: result.payment.status });
  } catch (error) {
    console.error("Cashier payment POST failed:", error);
    return fail((error as Error).message, 500);
  }
});
