"use client";
import { useState } from "react";
import Link from "next/link";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, KPICard, StatusChip, Skeleton } from "@/components/ui";
import { CheckCircleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface User { id: string; name: string; email: string; role: string; active: boolean; branchId: string | null }
interface Branch { id: string; name: string; address: string | null }
interface Subscription { id: string; amount: string; status: string; periodStart: string | null; periodEnd: string | null; createdAt: string }
interface Detail {
  tenant: {
    id: string;
    name: string;
    status: string;
    trialEnd: string | null;
    subStart: string | null;
    subEnd: string | null;
    createdAt: string;
    users: User[];
    branches: Branch[];
    subscriptions: Subscription[];
  };
  status: { state: string; trialDaysLeft: number | null; subDaysLeft: number | null; graceDaysLeft: number | null };
}

const num = (n: number | null) => (n === null ? "—" : String(n));

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const { t, navLabel } = useLang();
  const { data, reload } = usePoll<Detail>(`/api/saas/tenants/${params.id}`, 0);
  const [msg, setMsg] = useState<string | null>(null);

  async function action(path: string, body?: any) {
    setMsg(null);
    try {
      await api(`/api/saas/tenants/${params.id}/${path}`, { method: "PATCH", body: JSON.stringify(body ?? {}) });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!data) return <Skeleton className="h-8 w-56" />;
  const tenant = data.tenant;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/saas-admin/tenants" className="inline-flex items-center gap-1 text-sm text-brand-muted transition-colors hover:text-brand-foreground">{t("backTenants")}</Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">{tenant.name}</h1>
        <StatusChip status={tenant.status} />
        <StatusChip status={data.status.state} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label={t("subscriptionState")} value={data.status.state} tone="accent" />
        <KPICard label={t("trialDaysLeft")} value={num(data.status.trialDaysLeft)} tone="blue" />
        <KPICard label={t("subDaysLeft")} value={num(data.status.subDaysLeft)} tone="green" />
        <KPICard label={t("created")} value={new Date(tenant.createdAt).toLocaleDateString()} tone="blue" />
      </div>

      <Card className="space-y-2">
        <div className="font-medium">{t("supportActions")}</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { const reason = prompt(t("reasonForVoid")); if (reason) action("trial-extend", { days: 7, reason }); }}>{t("extendTrial7")}</Button>
          {tenant.status === "active" && (
            <Button variant="danger" onClick={() => confirm("Suspend this tenant? All users are locked out immediately.") && action("suspend")}>{t("suspend")}</Button>
          )}
          <Button variant="danger" onClick={() => confirm("Terminate (soft-delete) this tenant? Data retained 90 days.") && action("terminate")}>{t("terminate")}</Button>
        </div>
        {msg && <p className="text-sm text-status-red">{msg}</p>}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <div className="mb-2 font-medium">{t("staffWord")} <span className="tabular text-brand-muted">({tenant.users.length})</span></div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-brand-muted"><tr><th className="p-1.5 font-medium">{t("name")}</th><th className="p-1.5 font-medium">{t("email")}</th><th className="p-1.5 font-medium">{t("role")}</th><th className="p-1.5 font-medium">{t("active")}</th></tr></thead>
            <tbody>
              {tenant.users.map((u) => (
                <tr key={u.id} className="border-t border-brand-border/60">
                  <td className="p-1.5">{u.name}</td>
                  <td className="p-1.5 text-brand-muted">{u.email}</td>
                  <td className="p-1.5">{u.role}</td>
                  <td className="p-1.5">{u.active ? <CheckCircleIcon className="h-4 w-4 text-status-green" /> : <span className="text-brand-muted">—</span>}</td>
                </tr>
              ))}
              {tenant.users.length === 0 && <tr><td className="p-1.5 text-brand-muted" colSpan={4}>{t("noStaff")}</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="mb-2 font-medium">{navLabel("Branches")} <span className="tabular text-brand-muted">({tenant.branches.length})</span></div>
          <ul className="space-y-1 text-sm">
            {tenant.branches.map((b) => (
              <li key={b.id} className="border-t border-brand-border/60 pt-1.5 first:border-t-0"><span className="font-medium">{b.name}</span> <span className="text-brand-muted">{b.address ?? ""}</span></li>
            ))}
            {tenant.branches.length === 0 && <li className="text-brand-muted">{t("noBranches")}</li>}
          </ul>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <div className="mb-2 font-medium">{t("subscriptionHistory")}</div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-muted"><tr><th className="p-1.5 font-medium">{t("date")}</th><th className="p-1.5 font-medium">{t("amountCol")}</th><th className="p-1.5 font-medium">{t("period")}</th><th className="p-1.5 font-medium">{t("status")}</th></tr></thead>
          <tbody>
            {tenant.subscriptions.map((s) => (
              <tr key={s.id} className="border-t border-brand-border/60">
                <td className="tabular p-1.5">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="tabular p-1.5">{s.amount} ETB</td>
                <td className="tabular p-1.5 text-brand-muted">{s.periodStart ? new Date(s.periodStart).toLocaleDateString() : "—"} → {s.periodEnd ? new Date(s.periodEnd).toLocaleDateString() : "—"}</td>
                <td className="p-1.5"><StatusChip status={s.status} /></td>
              </tr>
            ))}
            {tenant.subscriptions.length === 0 && <tr><td className="p-1.5 text-brand-muted" colSpan={4}>{t("noSubRecords")}</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}