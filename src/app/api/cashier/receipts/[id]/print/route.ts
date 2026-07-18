import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { getBill } from "@/lib/services/orders";
import { buildEscPos, buildReceiptText, printReceipt, parsePrinterConfig, type ReceiptData } from "@/lib/integrations/printer";

/**
 * Trigger receipt printing via the branch's configured printer.
 * Reads printer config from branch.settingsJson.printer.
 * Returns ESC/POS bytes as base64 for client-side printing (bluetooth/browser).
 */
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  try {
    const { order, lines, total } = await getBill(params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id: me.tenantId } });
    const branch = me.branchId
      ? await prisma.branch.findUnique({ where: { id: me.branchId } })
      : null;
    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id, status: "CONFIRMED" },
      orderBy: { createdAt: "desc" },
    });

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

    // Get printer config from branch settings
    const printerConfig = parsePrinterConfig(branch?.settingsJson);
    const result = await printReceipt(data, printerConfig);

    // Always return the receipt text and ESC/POS bytes for client-side fallback
    const escposBase64 = buildEscPos(data).toString("base64");

    return ok({
      ...result,
      text: buildReceiptText(data),
      escpos: escposBase64,
      printerType: printerConfig.type,
    });
  } catch (e) {
    return fail((e as Error).message, 404);
  }
});
