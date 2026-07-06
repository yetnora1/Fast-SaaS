"use client";
import { useEffect, useMemo, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Card, KPICard, PageHeader, EmptyState, Input, Select, Button, Spinner, Field } from "@/components/ui";
import { CoinsIcon, ReceiptIcon, FileTextIcon, CheckCircleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

const etb = (n: number) => `${n.toLocaleString()} ETB`;
const METHOD_LABEL: Record<string, string> = { CASH: "Cash", TELEBIRR: "Telebirr", CBE_BIRR: "CBE Birr", SPLIT: "Split" };

interface Row {
  id: string;
  createdAt: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  table: number | null;
  branch: string;
  orderType: string;
  orderStatus: string;
  cashier: string | null;
}
interface PaymentsResp {
  rows: Row[];
  summary: { count: number; confirmedCount: number; confirmedTotal: number; byMethod: Record<string, { count: number; total: number }> };
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function statusClass(s: string): string {
  if (s === "CONFIRMED") return "bg-status-green/15 text-status-green";
  if (s === "PENDING") return "bg-status-yellow/15 text-status-yellow";
  if (s === "REFUNDED") return "bg-status-blue/15 text-status-blue";
  return "bg-status-red/15 text-status-red"; // FAILED
}

export default function OwnerPaymentsPage() {
  const { t, statusLabel } = useLang();
  const now = new Date();

  const [from, setFrom] = useState(fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(fmtDate(now));
  const [branchId, setBranchId] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  const branches = usePoll<{ branches: { id: string; name: string }[] }>("/api/owner/branches", 0);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (branchId) p.set("branchId", branchId);
    if (method) p.set("method", method);
    if (status) p.set("status", status);
    return p.toString();
  }, [from, to, branchId, method, status]);

  const { data, loading } = usePoll<PaymentsResp>(`/api/owner/payments?${query}`, 0);
  const rows = data?.rows ?? [];
  const summary = data?.summary;

  function setRange(kind: "today" | "7" | "30" | "month") {
    const end = new Date();
    let start = new Date();
    if (kind === "today") start = end;
    else if (kind === "7") start.setDate(end.getDate() - 6);
    else if (kind === "30") start.setDate(end.getDate() - 29);
    else start = new Date(end.getFullYear(), end.getMonth(), 1);
    setFrom(fmtDate(start));
    setTo(fmtDate(end));
  }

  function exportCsv() {
    const head = ["Date", "Branch", "Table", "Method", "Reference", "Cashier", "Status", "Amount(ETB)"];
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [new Date(r.createdAt).toLocaleString(), r.branch, r.table ?? "", METHOD_LABEL[r.method] ?? r.method, r.reference ?? "", r.cashier ?? "", r.status, r.amount]
        .map(cell)
        .join(","),
    );
    const csv = [head.map(cell).join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payments_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const presetBtn = "rounded-lg px-2.5 py-1 text-xs font-medium bg-brand-surface2 text-brand-muted hover:bg-white/10 transition-colors";

  return (
    <div className="space-y-5">
      <PageHeader title={t("paymentsTitle")} subtitle={t("paymentsSubtitle")}>
        <Button variant="ghost" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <FileTextIcon className="h-4 w-4" />
          {t("exportCsv")}
        </Button>
      </PageHeader>

      <PaymentAccountsCard />

      {/* Filters */}
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("dateFrom")}
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("dateTo")}
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("branch")}
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t("allBranches")}</option>
              {branches.data?.branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("method")}
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">{t("allMethods")}</option>
              {Object.entries(METHOD_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("status")}
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("allStatuses")}</option>
              {["CONFIRMED", "PENDING", "FAILED", "REFUNDED"].map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={presetBtn} onClick={() => setRange("today")}>{t("today")}</button>
          <button className={presetBtn} onClick={() => setRange("7")}>{t("last7")}</button>
          <button className={presetBtn} onClick={() => setRange("30")}>{t("last30")}</button>
          <button className={presetBtn} onClick={() => setRange("month")}>{t("thisMonth")}</button>
          {loading && <Spinner className="ml-1" />}
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KPICard label={t("confirmedRevenue")} value={etb(summary?.confirmedTotal ?? 0)} tone="green" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label={t("transactions")} value={String(summary?.count ?? 0)} tone="blue" icon={<ReceiptIcon className="h-5 w-5" />} />
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-brand-muted">{t("paymentMethods")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary && Object.keys(summary.byMethod).length > 0 ? (
              Object.entries(summary.byMethod).map(([m, v]) => (
                <span key={m} className="tabular rounded-lg bg-brand-surface2 px-2 py-1 text-xs">
                  <b>{METHOD_LABEL[m] ?? m}</b> · {etb(v.total)}
                </span>
              ))
            ) : (
              <span className="text-sm text-brand-muted">—</span>
            )}
          </div>
        </Card>
      </div>

      {/* Ledger */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-medium">{t("transactions")}</div>
          <div className="text-xs text-brand-muted">{t("showing")} {rows.length}</div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<ReceiptIcon className="h-7 w-7" />}>{t("noPayments")}</EmptyState>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-2 py-2 font-medium">{t("dateTime")}</th>
                  <th className="px-2 py-2 font-medium">{t("branch")}</th>
                  <th className="px-2 py-2 font-medium">{t("table")}</th>
                  <th className="px-2 py-2 font-medium">{t("method")}</th>
                  <th className="px-2 py-2 font-medium">{t("reference")}</th>
                  <th className="px-2 py-2 font-medium">{t("cashier")}</th>
                  <th className="px-2 py-2 font-medium">{t("status")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-brand-border/50 hover:bg-white/5">
                    <td className="whitespace-nowrap px-2 py-2 text-brand-muted">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2">{r.branch}</td>
                    <td className="tabular px-2 py-2">{r.table ?? "—"}</td>
                    <td className="px-2 py-2">{METHOD_LABEL[r.method] ?? r.method}</td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-brand-muted" title={r.reference ?? ""}>{r.reference ?? "—"}</td>
                    <td className="px-2 py-2">{r.cashier ?? "—"}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(r.status)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="tabular px-2 py-2 text-right font-semibold">{etb(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface PaymentAccounts {
  cbeAccountName: string | null;
  cbeAccountNumber: string | null;
  telebirrNumber: string | null;
}

// Owner-editable customer-facing payment accounts (CBE + Telebirr). These flow
// to the QR payment screen so customers pay the café's real accounts.
function PaymentAccountsCard() {
  const { t } = useLang();
  const [form, setForm] = useState<PaymentAccounts>({ cbeAccountName: "", cbeAccountNumber: "", telebirrNumber: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<PaymentAccounts>("/api/owner/payment-details")
      .then((d) => setForm({ cbeAccountName: d.cbeAccountName ?? "", cbeAccountNumber: d.cbeAccountNumber ?? "", telebirrNumber: d.telebirrNumber ?? "" }))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoaded(true));
  }, []);

  const set = (k: keyof PaymentAccounts) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSavedAt(false);
  };

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await api("/api/owner/payment-details", { method: "PUT", body: JSON.stringify(form) });
      setSavedAt(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <div className="font-medium">{t("paymentAccounts")}</div>
        <p className="mt-0.5 text-sm text-brand-muted">{t("paymentAccountsHint")}</p>
      </div>

      {!loaded ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-brand-border bg-brand-surface2/50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><span>🏦</span>{t("cbeAccount")}</div>
            <Field label={t("accountName")}>
              <Input value={form.cbeAccountName ?? ""} onChange={set("cbeAccountName")} placeholder="Abebe Bikila" />
            </Field>
            <Field label={t("accountNumber")}>
              <Input value={form.cbeAccountNumber ?? ""} onChange={set("cbeAccountNumber")} placeholder="1000123456789" inputMode="numeric" />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-brand-border bg-brand-surface2/50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><span>📱</span>{t("telebirrLabel")}</div>
            <Field label={t("telebirrPhone")}>
              <Input value={form.telebirrNumber ?? ""} onChange={set("telebirrNumber")} placeholder="0912 345 678" inputMode="tel" />
            </Field>
          </div>
        </div>
      )}

      {err && <p className="text-sm text-status-red">{err}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving} disabled={!loaded}>{t("savePaymentAccounts")}</Button>
        {savedAt && (
          <span className="inline-flex items-center gap-1.5 text-sm text-status-green">
            <CheckCircleIcon className="h-4 w-4" />{t("saved")}
          </span>
        )}
      </div>
    </Card>
  );
}
