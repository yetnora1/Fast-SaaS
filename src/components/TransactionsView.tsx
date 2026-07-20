"use client";
import { useMemo, useState } from "react";
import { usePoll } from "@/components/fetcher";
import { Card, PageHeader, Select, Input, Field, Spinner, EmptyState, RoleBadge, KPICard, Button } from "@/components/ui";
import { InboxIcon } from "@/components/icons";
import type { Role } from "@prisma/client";

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
  amount: number | null;
  status: string | null;
}

const ROLES: Role[] = ["cafe_owner", "cafe_manager", "cashier", "waiter", "barista", "kitchen", "store_manager"];

const KIND_META: Record<Kind, { label: string; cls: string }> = {
  PAYMENT: { label: "Payment", cls: "bg-status-green/10 text-status-greenText" },
  REFUND: { label: "Refund", cls: "bg-status-red/10 text-status-redText" },
  GOODS_ISSUE: { label: "Goods Issue", cls: "bg-status-blue/10 text-status-blueText" },
  PURCHASE: { label: "Purchase", cls: "bg-status-yellow/10 text-status-yellowText" },
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function money(n: number) {
  return `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

function roleTitle(r: Role) {
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TransactionsView() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(ymd(weekAgo));
  const [to, setTo] = useState(ymd(today));
  const [role, setRole] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [search, setSearch] = useState("");

  const url = `/api/transactions?from=${from}&to=${to}`;
  const { data, loading, reload } = usePoll<{ transactions: Txn[]; scope: "branch" | "tenant" }>(url, 0);
  const all = useMemo(() => data?.transactions ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      if (role !== "all" && t.actorRole !== role) return false;
      if (kind !== "all" && t.kind !== kind) return false;
      if (q && !t.description.toLowerCase().includes(q) && !t.actorName.toLowerCase().includes(q) && !(t.detail ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, role, kind, search]);

  const summary = useMemo(() => {
    let collected = 0, refunded = 0, purchased = 0, goodsCount = 0;
    for (const t of filtered) {
      if (t.kind === "PAYMENT" && t.status === "CONFIRMED" && t.amount != null) collected += t.amount;
      else if (t.kind === "REFUND" && t.amount != null) refunded += Math.abs(t.amount);
      else if (t.kind === "PURCHASE" && t.amount != null) purchased += Math.abs(t.amount);
      else if (t.kind === "GOODS_ISSUE") goodsCount += 1;
    }
    return { collected, refunded, purchased, goodsCount };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={data?.scope === "branch" ? "Your branch activity" : "All branches"}
      >
        <Button variant="ghost" size="sm" onClick={() => reload()}>Refresh</Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Collected" value={money(summary.collected)} tone="green" />
        <KPICard label="Refunded" value={money(summary.refunded)} tone="red" />
        <KPICard label="Purchases" value={money(summary.purchased)} tone="yellow" />
        <KPICard label="Goods Issues" value={String(summary.goodsCount)} tone="blue" />
      </div>

      {/* Filters */}
      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="From">
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleTitle(r)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">All types</option>
              {(Object.keys(KIND_META) as Kind[]).map((k) => (
                <option key={k} value={k}>{KIND_META[k].label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Search">
            <Input placeholder="Description, person…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Table */}
      {loading && all.length === 0 ? (
        <div className="flex h-40 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<InboxIcon className="h-7 w-7" />}>No transactions in this range.</EmptyState>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left text-[11px] uppercase tracking-wider text-brand-muted">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {filtered.map((t) => {
                  const d = new Date(t.timestamp);
                  return (
                    <tr key={t.id} className="hover:bg-brand-surface2/40 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-brand-muted">
                        <div className="text-brand-foreground">{d.toLocaleDateString()}</div>
                        <div className="text-xs">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_META[t.kind].cls}`}>
                          {KIND_META[t.kind].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-brand-foreground truncate">{t.description}</div>
                        {t.detail && <div className="text-xs text-brand-muted truncate">{t.detail}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-brand-foreground">{t.actorName}</div>
                        {t.actorRole && <div className="mt-0.5"><RoleBadge role={t.actorRole} /></div>}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold ${
                        t.amount == null ? "text-brand-muted" : t.amount < 0 ? "text-status-redText" : "text-status-greenText"
                      }`}>
                        {t.amount == null ? "—" : money(t.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-muted">{t.status ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-brand-muted">Showing {filtered.length} of {all.length} in range.</p>
    </div>
  );
}
