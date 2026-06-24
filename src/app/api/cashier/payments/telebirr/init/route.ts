import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { initTelebirr } from "@/lib/integrations/payments";
import { getBill } from "@/lib/services/orders";

const schema = z.object({ orderId: z.string().min(1), phone: z.string().min(7), amount: z.number().positive().optional() });

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const { total } = await getBill(body.orderId);
  const amount = body.amount ?? total;
  const init = await initTelebirr({ amount, phone: body.phone, orderId: body.orderId });

  const shift = me.branchId ? await prisma.shift.findFirst({ where: { branchId: me.branchId, status: "OPEN" } }) : null;
  // Record a PENDING payment; webhook confirms by reference.
  await prisma.payment.create({
    data: { orderId: body.orderId, method: "TELEBIRR", amount, reference: init.reference, status: "PENDING", cashierId: me.sub, shiftId: shift?.id },
  });
  await prisma.order.update({ where: { id: body.orderId }, data: { status: "PAYMENT_PENDING" } });
  return ok({ reference: init.reference, deepLink: init.deepLink, qr: init.qr, demo: init.demo });
});
