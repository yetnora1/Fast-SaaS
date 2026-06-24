"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, RoleBadge, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import type { Role } from "@prisma/client";

interface Staff { id: string; name: string; email: string; role: Role; active: boolean }

const ROLES = ["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"] as const;

export default function StaffPage() {
  const { t } = useLang();
  const { data, reload } = usePoll<{ staff: Staff[] }>("/api/owner/staff", 0);
  const [invite, setInvite] = useState({ email: "", role: "waiter" });
  const [msg, setMsg] = useState<string | null>(null);

  async function sendInvite() {
    setMsg(null);
    try {
      const res = await api<{ link: string }>("/api/owner/staff/invite", { method: "POST", body: JSON.stringify(invite) });
      setMsg(`Invite sent. Link: ${res.link}`);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function deactivate(id: string) {
    await api(`/api/owner/staff/${id}/role`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("staffManagement")} />
      <Card className="space-y-2">
        <div className="font-medium">{t("inviteStaff")}</div>
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder={t("email")} value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <Select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Button onClick={sendInvite} disabled={!invite.email}>{t("sendInvite")}</Button>
        </div>
        {msg && <p className="break-all text-xs text-brand-accent">{msg}</p>}
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="p-2 font-medium">{t("name")}</th><th className="p-2 font-medium">{t("email")}</th><th className="p-2 font-medium">{t("role")}</th><th className="p-2 font-medium">{t("status")}</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {data?.staff.map((s) => (
              <tr key={s.id} className="border-t border-brand-border/60">
                <td className="p-2">{s.name}</td>
                <td className="p-2 text-brand-muted">{s.email}</td>
                <td className="p-2"><RoleBadge role={s.role} /></td>
                <td className="p-2">{s.active ? t("active") : <span className="text-brand-muted">{t("inactive")}</span>}</td>
                <td className="p-2 text-right">{s.active && <Button variant="danger" size="sm" onClick={() => deactivate(s.id)}>{t("deactivate")}</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
