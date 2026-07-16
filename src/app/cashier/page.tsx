"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { ReceiptIcon, ArrowRightIcon, CheckCircleIcon, AlertTriangleIcon, ClockIcon, InboxIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface QueueOrder { id: string; status: string; table: { number: number } | null }
interface Bill { orderId: string; table: number | null; lines: { name: string; qty: number; lineTotal: number }[]; subtotal: number; vat: number; total: number; vatRate: number }
interface PendingPayment {
  orderId: string;
  table: number | null;
  status: string;
  txRef: string | null;
  receiptUrl: string;
  receiptIsPdf: boolean;
  createdAt: string;
  items: { name: string; qty: number; lineTotal: number }[];
  total: number;
}
interface PendingOrder {
  id: string;
  status: string;
  createdAt: string;
  table: { number: number } | null;
  waiter: { name: string } | null;
  items: { id: string; quantity: number; unitPrice: string; menuItem: { name: string; nameAm: string | null; price: string; station: string } }[];
  riskFlags?: { id: string; flagType: string }[];
}

export default function CashierPOS() {
  const { t, statusLabel } = useLang();
  const queue = usePoll<{ orders: QueueOrder[] }>("/api/cashier/bill-queue", 4000);
  const [bill, setBill] = useState<Bill | null>(null);
  const [method, setMethod] = useState<"CASH" | "TELEBIRR" | "CBE_BIRR">("CASH");
  const [tendered, setTendered] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [pending, setPending] = useState<{ reference: string; orderId: string } | null>(null);

  async function openBill(orderId: string) {
    setMsg(null);
    setReceipt(null);
    setPending(null);
    setBill(await api<Bill>(`/api/cashier/orders/${orderId}/bill`));
  }

  async function pay() {
    if (!bill) return;
    setMsg(null);
    try {
      if (method === "CASH") {
        const res = await api<{ changeDue: number }>("/api/cashier/payments", {
          method: "POST",
          body: JSON.stringify({ orderId: bill.orderId, method: "CASH", amount: bill.total, tendered: Number(tendered) }),
        });
        setMsg(`Paid. Change due: ${res.changeDue?.toLocaleString() ?? 0} ETB`);
        await printReceipt(bill.orderId);
      } else if (method === "TELEBIRR") {
        const res = await api<{ reference: string }>("/api/cashier/payments/telebirr/init", {
          method: "POST",
          body: JSON.stringify({ orderId: bill.orderId, phone }),
        });
        setPending({ reference: res.reference, orderId: bill.orderId });
        setMsg(`Telebirr request sent. Ref: ${res.reference}. Confirm below once the customer pays (demo).`);
      } else {
        const res = await api<{ reference: string }>("/api/cashier/payments/cbe/init", { method: "POST", body: JSON.stringify({ orderId: bill.orderId }) });
        setPending({ reference: res.reference, orderId: bill.orderId });
        setMsg(`CBE Birr reference: ${res.reference}. Confirm below once the customer pays (demo).`);
      }
      queue.reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function confirmDemo() {
    if (!pending) return;
    setMsg(null);
    try {
      await api("/api/cashier/payments/confirm-demo", { method: "POST", body: JSON.stringify({ reference: pending.reference }) });
      setMsg(`Payment confirmed (${pending.reference}).`);
      await printReceipt(pending.orderId);
      setPending(null);
      queue.reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function printReceipt(orderId: string) {
    const r = await api<{ text: string }>(`/api/cashier/receipts/${orderId}`);
    setReceipt(r.text);
    await api(`/api/cashier/receipts/${orderId}/print`, { method: "POST" });
  }

  return (
    <div className="space-y-4">
      <PendingCashierOrders />
      <PendingPayments />
      <div className="grid md:grid-cols-3 gap-4">
      <Card>
        <div className="mb-2 font-medium">{t("billQueue")}</div>
        <div className="space-y-1">
          {queue.data?.orders.length === 0 && <EmptyState icon={<ReceiptIcon className="h-7 w-7" />}>{t("noBills")}</EmptyState>}
          {queue.data?.orders.map((o) => (
            <button key={o.id} onClick={() => openBill(o.id)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-surface2 p-3 text-left transition-all hover:border-brand-accent/40 hover:bg-brand-surface2/80 min-h-[48px]">
              <span>{t("table")} {o.table?.number ?? "—"} · {statusLabel(o.status)}</span>
              <ArrowRightIcon className="h-4 w-4 text-brand-muted" />
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 md:col-span-2">
        {!bill ? (
          <EmptyState icon={<ArrowRightIcon className="h-7 w-7" />}>{t("selectBill")}</EmptyState>
        ) : (
          <>
            <div className="font-display text-lg font-bold">{t("table")} {bill.table ?? "—"}</div>
            <table className="w-full text-sm">
              <tbody>
                {bill.lines.map((l, i) => (
                  <tr key={i}><td className="py-1">{l.qty}× {l.name}</td><td className="tabular py-1 text-right">{l.lineTotal.toLocaleString()} ETB</td></tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-brand-border pt-2 text-sm">
              <div className="flex justify-between text-brand-muted"><span>{t("subtotal")}</span><span className="tabular">{bill.subtotal.toLocaleString()} ETB</span></div>
              <div className="flex justify-between text-brand-muted"><span>VAT ({Math.round(bill.vatRate * 100)}%)</span><span className="tabular">{bill.vat.toLocaleString()} ETB</span></div>
              <div className="flex justify-between text-lg font-bold"><span>{t("total")}</span><span className="tabular">{bill.total.toLocaleString()} ETB</span></div>
            </div>

            <div className="flex gap-2">
              {(["CASH", "TELEBIRR", "CBE_BIRR"] as const).map((m) => (
                <Button key={m} variant={method === m ? "primary" : "ghost"} onClick={() => setMethod(m)}>{m}</Button>
              ))}
            </div>
            {method === "CASH" && <Input type="number" placeholder={t("amountTendered")} value={tendered} onChange={(e) => setTendered(e.target.value)} />}
            {method === "TELEBIRR" && <Input placeholder={t("customerPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} />}
            <Button className="w-full" onClick={pay}>{t("processPayment")}</Button>
            {pending && (
              <div className="animate-fade rounded-lg border border-status-yellow/40 bg-status-yellow/10 p-3 space-y-2">
                <p className="text-sm text-status-yellowText">Demo · Ref {pending.reference}</p>
                <Button className="w-full" onClick={confirmDemo}>{t("confirmDemo")}</Button>
              </div>
            )}
            {msg && <p className="text-sm text-brand-accentText">{msg}</p>}
            {receipt && <pre className="whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-bg/60 p-3 text-xs">{receipt}</pre>}
          </>
        )}
      </Card>
      </div>
    </div>
  );
}

// ── Pending Cashier Approval Orders ──────────────────────────────────
function PendingCashierOrders() {
  const { t, tr } = useLang();
  const { data, reload } = usePoll<{ orders: PendingOrder[] }>("/api/cashier/pending-orders", 3000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<PendingOrder | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const orders = data?.orders ?? [];
  if (orders.length === 0 && data) return null;

  async function approve(orderId: string) {
    setBusyId(orderId);
    setErr(null);
    try {
      await api(`/api/cashier/orders/${orderId}/approve`, { method: "POST" });
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function decline(orderId: string) {
    if (!reason.trim()) return;
    setBusyId(orderId);
    setErr(null);
    try {
      await api(`/api/cashier/orders/${orderId}/decline`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setDeclineFor(null);
      setReason("");
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="border-brand-accent/30 bg-brand-accent/[0.04]">
      <div className="mb-3 flex items-center gap-2">
        <ClockIcon className="h-5 w-5 text-brand-accentText" />
        <span className="font-display font-bold">{t("pendingCashierOrders")}</span>
        <span className="tabular rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs font-bold text-brand-accentText">{orders.length}</span>
      </div>

      {err && <p className="mb-2 text-sm text-status-redText">{err}</p>}

      {!data && (
        <div className="flex items-center gap-2 text-sm text-brand-muted py-4">
          <ClockIcon className="h-4 w-4 animate-spin" /> Loading...
        </div>
      )}

      {data && orders.length === 0 && (
        <EmptyState icon={<InboxIcon className="h-7 w-7" />}>{t("noPendingOrders")}</EmptyState>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => {
          const busy = busyId === o.id;
          const total = o.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
          return (
            <div key={o.id} className="flex flex-col gap-2.5 rounded-xl border border-brand-border bg-brand-surface p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{t("table")} {o.table?.number ?? "—"}</div>
                  {o.waiter && <div className="text-xs text-brand-muted">{t("waiterLabel")}: {o.waiter.name}</div>}
                </div>
                <div className="text-right">
                  <div className="tabular text-lg font-bold text-brand-accentText">{total.toLocaleString()} ETB</div>
                  <div className="text-[10px] text-brand-muted uppercase tracking-wider">{t("estimatedTotal")}</div>
                </div>
              </div>

              {o.riskFlags && o.riskFlags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {o.riskFlags.map((rf) => (
                    <span key={rf.id} className="inline-flex items-center rounded-full bg-status-yellow/15 px-2 py-0.5 text-[9px] font-bold text-status-yellowText uppercase tracking-wider">
                      ⚠️ {rf.flagType.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-xs text-brand-muted">
                {o.items.map((it) => `${it.quantity}× ${tr(it.menuItem.name, it.menuItem.nameAm)}`).join(", ")}
              </div>

              <div className="mt-auto flex gap-2">
                <Button size="sm" className="flex-1" loading={busy} onClick={() => approve(o.id)}>
                  <CheckCircleIcon className="h-4 w-4" />{t("approveOrder")}
                </Button>
                <Button size="sm" variant="danger" className="flex-1" disabled={busy} onClick={() => { setDeclineFor(o); setReason(""); }}>
                  <AlertTriangleIcon className="h-4 w-4" />{t("declineOrder")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decline confirm modal */}
      {declineFor && (
        <div className="animate-fade fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDeclineFor(null)}>
          <div className="animate-in w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 font-display text-lg font-bold">{t("confirmDeclineOrder")}</div>
            <p className="mb-3 text-sm text-brand-muted">{t("table")} {declineFor.table?.number ?? "—"}</p>
            <Input placeholder={t("declineReasonLabel")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDeclineFor(null)}>{t("cancel")}</Button>
              <Button variant="danger" className="flex-1" loading={busyId === declineFor.id} disabled={!reason.trim()} onClick={() => decline(declineFor.id)}>
                {t("confirmDeclineOrder")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Pending customer-receipt payments (QR prepaid orders awaiting review) ──
function PendingPayments() {
  const { t } = useLang();
  const { data, reload } = usePoll<{ orders: PendingPayment[] }>("/api/cashier/payments/pending", 5000);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<PendingPayment | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const orders = data?.orders ?? [];
  if (orders.length === 0) return null;

  async function review(orderId: string, decision: "approve" | "decline", declineReason?: string) {
    setBusyId(orderId);
    setErr(null);
    try {
      await api("/api/cashier/payments/review", {
        method: "POST",
        body: JSON.stringify({ orderId, decision, reason: declineReason }),
      });
      setDeclineFor(null);
      setReason("");
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="border-status-yellow/40 bg-status-yellow/[0.06]">
      <div className="mb-3 flex items-center gap-2">
        <ReceiptIcon className="h-5 w-5 text-status-yellowText" />
        <span className="font-display font-bold">{t("pendingPayments")}</span>
        <span className="tabular rounded-full bg-status-yellow/20 px-2 py-0.5 text-xs font-bold text-status-yellowText">{orders.length}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-brand-muted"><ClockIcon className="h-3.5 w-3.5" />{t("verifyReceiptHint")}</span>
      </div>

      {err && <p className="mb-2 text-sm text-status-redText">{err}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => {
          const busy = busyId === o.orderId;
          return (
            <div key={o.orderId} className="flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-surface2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{t("table")} {o.table ?? "—"}</div>
                  <div className="tabular text-lg font-bold text-brand-accentText">{o.total.toLocaleString()} ETB</div>
                </div>
                <button
                  onClick={() => setViewUrl(o.receiptUrl)}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-border bg-brand-bg"
                  title={t("viewReceipt")}
                >
                  {o.receiptIsPdf ? (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-brand-muted">
                      <ReceiptIcon className="h-5 w-5" />
                      <span className="text-[9px] font-bold">PDF</span>
                    </span>
                  ) : (
                    <>
                      <img
                        src={o.receiptUrl}
                        alt="receipt"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => { (e.currentTarget.style.display = "none"); }}
                      />
                      <span className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center text-[9px] font-bold text-brand-muted">{t("viewReceipt")}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-brand-muted line-clamp-2">
                {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
              </div>
              {o.txRef && <div className="tabular truncate text-xs text-brand-muted">{t("refLabel")}: {o.txRef}</div>}

              <div className="mt-auto flex gap-2">
                <Button size="sm" className="flex-1" loading={busy} onClick={() => review(o.orderId, "approve")}>
                  <CheckCircleIcon className="h-4 w-4" />{t("approve")}
                </Button>
                <Button size="sm" variant="danger" className="flex-1" disabled={busy} onClick={() => { setDeclineFor(o); setReason(""); }}>
                  <AlertTriangleIcon className="h-4 w-4" />{t("decline")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receipt lightbox */}
      {viewUrl && (
        <div className="animate-fade fixed inset-0 z-modal flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setViewUrl(null)}>
          <div className="animate-in flex max-h-[90vh] w-full max-w-2xl flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-white">{t("paymentReceipt")}</span>
              <a href={viewUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-accentText underline">{t("openOriginal")}</a>
            </div>
            {orders.find((o) => o.receiptUrl === viewUrl)?.receiptIsPdf ? (
              <iframe src={viewUrl} className="h-[80vh] w-full rounded-xl border border-brand-border bg-white" title="receipt" />
            ) : (
              <img src={viewUrl} alt="receipt" className="max-h-[85vh] w-full rounded-xl object-contain" />
            )}
          </div>
        </div>
      )}

      {/* Decline confirm */}
      {declineFor && (
        <div className="animate-fade fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDeclineFor(null)}>
          <div className="animate-in w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 font-display text-lg font-bold">{t("declinePayment")}</div>
            <p className="mb-3 text-sm text-brand-muted">{t("declineWarning")}</p>
            <Input placeholder={t("reasonOptional")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDeclineFor(null)}>{t("cancel")}</Button>
              <Button variant="danger" className="flex-1" loading={busyId === declineFor.orderId} onClick={() => review(declineFor.orderId, "decline", reason)}>
                {t("confirmDecline")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
