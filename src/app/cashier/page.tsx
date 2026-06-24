"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, Input } from "@/components/ui";
import { ReceiptIcon, ArrowRightIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface QueueOrder { id: string; status: string; table: { number: number } | null }
interface Bill { orderId: string; table: number | null; lines: { name: string; qty: number; lineTotal: number }[]; subtotal: number; vat: number; total: number; vatRate: number }

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
  );
}
