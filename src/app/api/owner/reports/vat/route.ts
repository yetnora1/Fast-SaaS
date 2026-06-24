import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum, vatFromInclusive, round2 } from "@/lib/money";

// Ethiopian ERCA VAT report — net, VAT (15%), gross over a period (spec §2.7).
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : startOfMonth();
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();

  const payments = await prisma.payment.findMany({
    where: { status: "CONFIRMED", order: { tenantId: me.tenantId, status: "COMPLETED", createdAt: { gte: from, lte: to } } },
  });

  let gross = 0;
  for (const p of payments) gross += toNum(p.amount);
  const v = vatFromInclusive(gross);

  return ok({
    period: { from, to },
    grossSales: round2(gross),
    netSales: v.subtotal,
    vatCollected: v.vat,
    vatRate: v.vatRate,
    transactionCount: payments.length,
  });
});

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
