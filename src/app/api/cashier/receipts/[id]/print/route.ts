import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { getBill } from "@/lib/services/orders";
import { buildEscPos, type ReceiptData } from "@/lib/integrations/printer";

// Trigger thermal print (ESC/POS). Stub returns byte length; wire `escpos` in prod.
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  try {
    const { order, lines, total } = await getBill(params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id: me.tenantId } });
    const data: ReceiptData = {
      cafeName: tenant?.name ?? "Cafe",
      tin: "0000000000",
      branch: "",
      orderId: order.id,
      cashier: me.name,
      items: lines.map((l) => ({ name: l.name, qty: l.qty, lineTotal: l.lineTotal })),
      total,
      method: "—",
      createdAt: new Date(),
    };
    const buffer = buildEscPos(data);
    // TODO(live): stream `buffer` to USB/network thermal printer via escpos.
    return ok({ printed: true, bytes: buffer.length, stubbed: true });
  } catch (e) {
    return fail((e as Error).message, 404);
  }
});
