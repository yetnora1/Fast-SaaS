"use client";
import { useState } from "react";
import Link from "next/link";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, StatusChip, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Tenant {
  id: string;
  name: string;
  status: string;
  trialEnd: string | null;
  subEnd: string | null;
  _count: { users: number; branches: number };
}

export default function TenantsPage() {
  const { t, navLabel } = useLang();
  const { data, reload } = usePoll<{ tenants: Tenant[] }>("/api/saas/tenants", 0);
  const [form, setForm] = useState({ businessName: "", ownerName: "", ownerEmail: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function createTenant() {
    setMsg(null);
    try {
      const res = await api<{ tempPassword: string }>("/api/saas/tenants", { method: "POST", body: JSON.stringify({ ...form, branchCount: 1 }) });
      setMsg(`Created. Temp password: ${res.tempPassword}`);
      setForm({ businessName: "", ownerName: "", ownerEmail: "" });
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function action(id: string, path: string, body?: any) {
    await api(`/api/saas/tenants/${id}/${path}`, { method: "PATCH", body: JSON.stringify(body ?? {}) });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={navLabel("Tenants")} />
      <Card className="space-y-2">
        <div className="font-medium">{t("addNewCafe")}</div>
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder={t("businessName")} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          <Input placeholder={t("ownerName")} value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          <Input placeholder={t("ownerEmail")} value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
        </div>
        <Button onClick={createTenant}>{t("createTenant")}</Button>
        {msg && <p className="text-sm text-brand-accent">{msg}</p>}
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="p-2 font-medium">{t("name")}</th>
              <th className="p-2 font-medium">{t("status")}</th>
              <th className="p-2 font-medium">{t("staffWord")}</th>
              <th className="p-2 font-medium">{navLabel("Branches")}</th>
              <th className="p-2 font-medium">{t("subEnd")}</th>
              <th className="p-2 font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.tenants.map((tn) => (
              <tr key={tn.id} className="border-t border-brand-border/60">
                <td className="p-2"><Link href={`/saas-admin/tenants/${tn.id}`} className="font-medium text-brand-accent hover:underline">{tn.name}</Link></td>
                <td className="p-2"><StatusChip status={tn.status} /></td>
                <td className="tabular p-2">{tn._count.users}</td>
                <td className="tabular p-2">{tn._count.branches}</td>
                <td className="tabular p-2">{tn.subEnd ? new Date(tn.subEnd).toLocaleDateString() : "—"}</td>
                <td className="flex gap-1 p-2">
                  <Button variant="ghost" size="sm" onClick={() => action(tn.id, "trial-extend", { days: 7, reason: "support" })}>{t("extend7dTrial")}</Button>
                  {tn.status === "active" ? (
                    <Button variant="danger" size="sm" onClick={() => action(tn.id, "suspend")}>{t("suspend")}</Button>
                  ) : (
                    <span className="px-2 py-2 text-xs text-brand-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
