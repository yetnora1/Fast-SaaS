"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Field, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Branch { id: string; name: string; address: string | null; _count: { tables: number; users: number } }

export default function BranchesPage() {
  const { t, navLabel } = useLang();
  const { data, reload } = usePoll<{ branches: Branch[] }>("/api/owner/branches", 0);
  const [form, setForm] = useState({ name: "", address: "" });

  async function add() {
    await api("/api/owner/branches", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", address: "" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={navLabel("Branches")} />
      <Card className="flex items-end gap-2">
        <div className="flex-1"><Field label={t("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
        <div className="flex-1"><Field label={t("address")}><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
        <Button onClick={add} disabled={!form.name}>{t("addBranch")}</Button>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {data?.branches.map((b) => (
          <Card key={b.id}>
            <div className="font-display font-bold">{b.name}</div>
            <div className="text-sm text-brand-muted">{b.address ?? "—"}</div>
            <div className="tabular mt-2 text-xs text-brand-muted">{b._count.tables} {t("tablesWord")} · {b._count.users} {t("staffWord")}</div>
            <div className="mt-1 text-xs text-brand-muted">ID: <code className="rounded bg-brand-surface2 px-1 py-0.5">{b.id}</code></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
