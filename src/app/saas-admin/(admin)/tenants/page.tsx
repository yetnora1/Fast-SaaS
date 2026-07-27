"use client";
import { useState } from "react";
import Link from "next/link";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, StatusChip, PageHeader, Modal, Field } from "@/components/ui";
import { AlertTriangleIcon } from "@/components/icons";
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
  const [removing, setRemoving] = useState<Tenant | null>(null);

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
        {msg && <p className="text-sm text-brand-accentText">{msg}</p>}
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
                <td className="p-2"><Link href={`/saas-admin/tenants/${tn.id}`} className="font-medium text-brand-accentText hover:underline">{tn.name}</Link></td>
                <td className="p-2"><StatusChip status={tn.status} /></td>
                <td className="tabular p-2">{tn._count.users}</td>
                <td className="tabular p-2">{tn._count.branches}</td>
                <td className="tabular p-2">{tn.subEnd ? new Date(tn.subEnd).toLocaleDateString() : "—"}</td>
                <td className="flex flex-wrap items-center gap-1 p-2">
                  <Button variant="ghost" size="sm" onClick={() => action(tn.id, "trial-extend", { days: 7, reason: "support" })}>{t("extend7dTrial")}</Button>
                  {tn.status === "active" ? (
                    <Button variant="danger" size="sm" onClick={() => action(tn.id, "suspend")}>{t("suspend")}</Button>
                  ) : (
                    <span className="px-2 py-2 text-xs text-brand-muted">—</span>
                  )}
                  {/* Solid red, matching Suspend — the destructive actions read as
                      one group. The type-the-name confirmation is what actually
                      guards this, not the button's weight. */}
                  <Button variant="danger" size="sm" onClick={() => setRemoving(tn)}>
                    {t("removeCafe")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {removing && (
        <RemoveTenantModal
          tenant={removing}
          onClose={() => setRemoving(null)}
          onRemoved={(name) => { setRemoving(null); setMsg(`Removed "${name}" and all of its data.`); reload(); }}
        />
      )}
    </div>
  );
}

/**
 * Permanent removal, gated behind retyping the cafe's name.
 *
 * The same check runs server-side — this is the humane version of it, not the
 * security boundary. It spells out exactly what disappears, because "Remove"
 * next to "Suspend" reads far more reversible than it is.
 */
function RemoveTenantModal({
  tenant, onClose, onRemoved,
}: { tenant: Tenant; onClose: () => void; onRemoved: (name: string) => void }) {
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirmName.trim() === tenant.name;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/saas/tenants/${tenant.id}`, { method: "DELETE", body: JSON.stringify({ confirmName }) });
      onRemoved(tenant.name);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Remove cafe permanently">
      <div className="space-y-3">
        <div className="flex gap-2.5 rounded-lg bg-status-red/10 p-3">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-redText" />
          <div className="space-y-1 text-xs leading-5 text-brand-foreground">
            <p className="font-bold text-status-redText">This cannot be undone.</p>
            <p>
              Deletes <span className="font-semibold">{tenant.name}</span> and everything it owns —{" "}
              <span className="tabular font-semibold">{tenant._count.users}</span> staff account
              {tenant._count.users === 1 ? "" : "s"},{" "}
              <span className="tabular font-semibold">{tenant._count.branches}</span> branch
              {tenant._count.branches === 1 ? "" : "es"}, and all menus, orders, payments, stock and
              support history.
            </p>
            <p className="text-brand-muted">
              To keep the data and only cut off access, use <span className="font-semibold">Suspend</span> instead.
            </p>
          </div>
        </div>

        <Field label={`Type "${tenant.name}" to confirm`} required>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={tenant.name}
            autoFocus
            aria-label="Confirm cafe name"
          />
        </Field>

        {error && <p className="text-sm text-status-redText">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={remove} loading={busy} disabled={!matches}>
            Remove permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
}
