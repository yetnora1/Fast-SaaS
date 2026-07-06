import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum, round2 } from "@/lib/money";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

const METHODS: PaymentMethod[] = ["CASH", "TELEBIRR", "CBE_BIRR", "SPLIT"];
const STATUSES: PaymentStatus[] = ["PENDING", "CONFIRMED", "FAILED", "REFUNDED"];

/**
 * Owner payments ledger — every payment across the tenant's branches, filterable
 * by date range (default: this month), branch, method and status. Returns the
 * rows plus a summary (confirmed revenue + a per-method breakdown).
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const url = new URL(req.url);

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam ? startOfDay(fromParam) : startOfMonth();
  const to = toParam ? endOfDay(toParam) : endOfDay();

  const branchId = url.searchParams.get("branchId") || undefined;
  const methodParam = url.searchParams.get("method") as PaymentMethod | null;
  const statusParam = url.searchParams.get("status") as PaymentStatus | null;
  const method = methodParam && METHODS.includes(methodParam) ? methodParam : undefined;
  const status = statusParam && STATUSES.includes(statusParam) ? statusParam : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      ...(method ? { method } : {}),
      ...(status ? { status } : {}),
      order: { tenantId: me.tenantId, ...(branchId ? { branchId } : {}) },
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          type: true,
          guestTableNumber: true,
          table: { select: { number: true } },
          branch: { select: { name: true } },
        },
      },
      cashier: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const rows = payments.map((p) => ({
    id: p.id,
    createdAt: p.createdAt,
    amount: toNum(p.amount),
    method: p.method,
    status: p.status,
    reference: p.reference,
    table: p.order.table?.number ?? p.order.guestTableNumber ?? null,
    branch: p.order.branch.name,
    orderType: p.order.type,
    orderStatus: p.order.status,
    cashier: p.cashier?.name ?? null,
  }));

  // Confirmed payments drive the revenue summary + per-method breakdown.
  const byMethod: Record<string, { count: number; total: number }> = {};
  let confirmedTotal = 0;
  let confirmedCount = 0;
  for (const p of payments) {
    if (p.status !== "CONFIRMED") continue;
    const amt = toNum(p.amount);
    confirmedTotal += amt;
    confirmedCount += 1;
    const b = (byMethod[p.method] ??= { count: 0, total: 0 });
    b.count += 1;
    b.total += amt;
  }
  for (const k of Object.keys(byMethod)) byMethod[k].total = round2(byMethod[k].total);

  return ok({
    period: { from, to },
    rows,
    summary: { count: payments.length, confirmedCount, confirmedTotal: round2(confirmedTotal), byMethod },
  });
});

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfDay(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(s?: string) {
  const d = s ? new Date(s) : new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
