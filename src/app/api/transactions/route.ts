import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { toNum } from "@/lib/money";
import type { Role } from "@prisma/client";

// Unified activity ledger for owners & managers: money in (payments), money out
// (refunds, purchases) and stock issued (goods issues), normalised to one shape.
// Owners see the whole tenant; managers are scoped to their own branch (for the
// branch-bound sources). Filtering by actor role / type happens on the client;
// this endpoint just bounds by date + scope so the payload stays small.

export const dynamic = "force-dynamic";

type Kind = "PAYMENT" | "REFUND" | "GOODS_ISSUE" | "PURCHASE";

interface Txn {
  id: string;
  kind: Kind;
  timestamp: string;
  actorId: string | null;
  actorName: string;
  actorRole: Role | null;
  description: string;
  detail: string | null;
  amount: number | null; // signed cash impact (+in / -out); null = non-cash (goods)
  status: string | null;
}

const PER_SOURCE = 500; // cap each source within the window
const TOTAL_CAP = 1000; // cap the merged feed

export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner", "cafe_manager");
  const tenantId = me.tenantId;
  // Managers only ever see their own branch; owners see every branch (undefined).
  const branchId = me.role === "cafe_manager" ? me.branchId ?? undefined : undefined;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const now = new Date();
  // Interpret the yyyy-mm-dd inputs as Ethiopian (UTC+3) day boundaries, matching
  // the rest of the app; fall back to the last 7 days.
  const parsedFrom = fromParam ? new Date(`${fromParam}T00:00:00.000+03:00`) : null;
  const parsedTo = toParam ? new Date(`${toParam}T23:59:59.999+03:00`) : null;
  const fromDate = parsedFrom && !isNaN(parsedFrom.getTime()) ? parsedFrom : new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const toDate = parsedTo && !isNaN(parsedTo.getTime()) ? parsedTo : now;

  const orderScope = { tenantId, ...(branchId ? { branchId } : {}) };

  const [payments, refunds, goods, purchases, branches] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate }, order: orderScope },
      select: {
        id: true, amount: true, method: true, status: true, createdAt: true,
        order: { select: { id: true, branch: { select: { name: true } }, table: { select: { number: true } }, guestTableNumber: true } },
        cashier: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
    }),
    prisma.refund.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate }, order: orderScope },
      select: {
        id: true, amount: true, reason: true, createdAt: true, approvedBy: true, executedBy: true,
        order: { select: { id: true, branch: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
    }),
    prisma.goodsIssue.findMany({
      where: { tenantId, ...(branchId ? { branchId } : {}), issuedAt: { gte: fromDate, lte: toDate } },
      select: {
        id: true, quantity: true, unit: true, itemName: true, destination: true, status: true, issuedAt: true, branchId: true,
        issuedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { issuedAt: "desc" },
      take: PER_SOURCE,
    }),
    // Purchase orders are tenant-level (no branch dimension), so both roles see the
    // tenant's purchasing activity. Drafts aren't real transactions — skip them.
    prisma.purchaseOrder.findMany({
      where: { tenantId, createdAt: { gte: fromDate, lte: toDate }, status: { not: "DRAFT" } },
      select: {
        id: true, total: true, status: true, createdAt: true, approvedBy: true,
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
    }),
    prisma.branch.findMany({ where: { tenantId }, select: { id: true, name: true } }),
  ]);

  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  // Refund/purchase actors are stored as bare user ids — batch-resolve their name/role.
  const actorIds = new Set<string>();
  refunds.forEach((r) => { const id = r.executedBy ?? r.approvedBy; if (id) actorIds.add(id); });
  purchases.forEach((p) => { if (p.approvedBy) actorIds.add(p.approvedBy); });
  const actorRows = actorIds.size
    ? await prisma.user.findMany({ where: { id: { in: [...actorIds] } }, select: { id: true, name: true, role: true } })
    : [];
  const actorMap = new Map(actorRows.map((a) => [a.id, a]));

  const txns: Txn[] = [];

  for (const p of payments) {
    const tableNo = p.order.table?.number ?? p.order.guestTableNumber;
    txns.push({
      id: `pay_${p.id}`,
      kind: "PAYMENT",
      timestamp: p.createdAt.toISOString(),
      actorId: p.cashier?.id ?? null,
      actorName: p.cashier?.name ?? "—",
      actorRole: p.cashier?.role ?? null,
      description: `${p.method} payment`,
      detail: [p.order.branch?.name, tableNo != null ? `Table ${tableNo}` : null, `Order #${p.order.id.slice(-6)}`].filter(Boolean).join(" · "),
      amount: toNum(p.amount),
      status: p.status,
    });
  }

  for (const r of refunds) {
    const actor = (r.executedBy ?? r.approvedBy) ? actorMap.get((r.executedBy ?? r.approvedBy)!) : null;
    txns.push({
      id: `ref_${r.id}`,
      kind: "REFUND",
      timestamp: r.createdAt.toISOString(),
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "—",
      actorRole: actor?.role ?? null,
      description: "Refund",
      detail: [r.order.branch?.name, r.reason].filter(Boolean).join(" · ") || null,
      amount: -toNum(r.amount),
      status: null,
    });
  }

  for (const g of goods) {
    txns.push({
      id: `goi_${g.id}`,
      kind: "GOODS_ISSUE",
      timestamp: g.issuedAt.toISOString(),
      actorId: g.issuedBy?.id ?? null,
      actorName: g.issuedBy?.name ?? "—",
      actorRole: g.issuedBy?.role ?? null,
      description: `Issued ${toNum(g.quantity)} ${g.unit} ${g.itemName}`,
      detail: [branchName.get(g.branchId), `→ ${g.destination}`].filter(Boolean).join(" · "),
      amount: null,
      status: g.status,
    });
  }

  for (const p of purchases) {
    const actor = p.approvedBy ? actorMap.get(p.approvedBy) : null;
    txns.push({
      id: `pur_${p.id}`,
      kind: "PURCHASE",
      timestamp: p.createdAt.toISOString(),
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? "—",
      actorRole: actor?.role ?? null,
      description: "Purchase order",
      detail: p.supplier?.name ?? null,
      amount: -toNum(p.total),
      status: p.status,
    });
  }

  txns.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));

  return ok({
    transactions: txns.slice(0, TOTAL_CAP),
    range: { from: fromDate.toISOString(), to: toDate.toISOString() },
    scope: branchId ? "branch" : "tenant",
  });
});
