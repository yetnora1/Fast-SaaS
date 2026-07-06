"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { ReceiptIcon, ArrowRightIcon, CheckCircleIcon, AlertTriangleIcon, ClockIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface QueueOrder { id: string; status: string; table: { number: number } | null }
interface Bill { orderId: string; table: number | null; lines: { name: string; qty: number; lineTotal: number }[]; subtotal: number; vat: number; total: number; vatRate: number }
interface PendingPayment {
  orderId: string;
  table: number | null;
  status: string;
  txRef: string | null;
  receiptUrl: string;
  createdAt: string;
  items: { name: string; qty: number; lineTotal: number }[];
  total: number;
}

export default function CashierPOS() {
  const { t } = useLang();
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
      <PendingPayments />
      <div className="grid md:grid-cols-3 gap-4">
      <Card>
        <div className="mb-2 font-medium">{t("billQueue")}</div>
        <div className="space-y-1">
          {queue.data?.orders.length === 0 && <EmptyState icon={<ReceiptIcon className="h-7 w-7" />}>{t("noBills")}</EmptyState>}
          {queue.data?.orders.map((o) => (
            <button key={o.id} onClick={() => openBill(o.id)} className="touch-target flex w-full items-center justify-between gap-2 rounded-xl bg-brand-surface2 p-3 text-left transition-colors hover:bg-white/10">
              <span>{t("table")} {o.table?.number ?? "—"} · {o.status}</span>
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
                <p className="text-sm text-status-yellow">Demo · Ref {pending.reference}</p>
                <Button className="w-full" onClick={confirmDemo}>{t("confirmDemo")}</Button>
              </div>
            )}
            {msg && <p className="text-sm text-brand-accent">{msg}</p>}
            {receipt && <pre className="whitespace-pre-wrap rounded-lg border border-brand-border bg-brand-bg/60 p-3 text-xs">{receipt}</pre>}
          </>
        )}
      </Card>
      </div>
    </div>
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
        <ReceiptIcon className="h-5 w-5 text-status-yellow" />
        <span className="font-display font-bold">{t("pendingPayments")}</span>
        <span className="tabular rounded-full bg-status-yellow/20 px-2 py-0.5 text-xs font-bold text-status-yellow">{orders.length}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-brand-muted"><ClockIcon className="h-3.5 w-3.5" />{t("verifyReceiptHint")}</span>
      </div>

      {err && <p className="mb-2 text-sm text-status-red">{err}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => {
          const isPdf = o.receiptUrl.toLowerCase().includes(".pdf");
          const busy = busyId === o.orderId;
          return (
            <div key={o.orderId} className="flex flex-col gap-3 rounded-xl border border-brand-border bg-brand-surface2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{t("table")} {o.table ?? "—"}</div>
                  <div className="tabular text-lg font-bold text-brand-accent">{o.total.toLocaleString()} ETB</div>
                </div>
                <button
                  onClick={() => setViewUrl(o.receiptUrl)}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-border bg-brand-bg"
                  title={t("viewReceipt")}
                >
                  {isPdf ? (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-brand-muted">PDF</span>
                  ) : (
                    <img src={o.receiptUrl} alt="receipt" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
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
              <a href={viewUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-accent underline">{t("openOriginal")}</a>
            </div>
            {viewUrl.toLowerCase().includes(".pdf") ? (
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
