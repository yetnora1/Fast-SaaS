import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { getBill } from "@/lib/services/orders";
import { buildReceiptText, type ReceiptData } from "@/lib/integrations/printer";

// ERCA-format receipt preview (text + structured) for an order.
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  try {
    const { order, lines, total } = await getBill(params.id);
    const branch = await prisma.branch.findUnique({ where: { id: order.branchId } });
    const tenant = await prisma.tenant.findUnique({ where: { id: me.tenantId } });
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id, status: "CONFIRMED" }, orderBy: { createdAt: "desc" } });

    const data: ReceiptData = {
      cafeName: tenant?.name ?? "Cafe",
      tin: "0000000000",
      branch: branch?.name ?? "",
      orderId: order.id,
      cashier: me.name,
      items: lines.map((l) => ({ name: l.name, qty: l.qty, lineTotal: l.lineTotal })),
      total,
      method: payment?.method ?? "—",
      createdAt: new Date(),
    };
    return ok({ text: buildReceiptText(data), data });
  } catch (e) {
    return fail((e as Error).message, 404);
  }
});
