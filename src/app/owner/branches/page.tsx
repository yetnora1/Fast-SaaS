"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Field, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { TableQRCodes } from "@/components/TableQR";

interface Branch { id: string; name: string; address: string | null; _count: { tables: number; users: number } }

export default function BranchesPage() {
  const { t, navLabel } = useLang();
  const { data, reload } = usePoll<{ branches: Branch[] }>("/api/owner/branches", 0);
  const [form, setForm] = useState({ name: "", address: "" });
  const [viewingBranch, setViewingBranch] = useState<{ id: string; name: string } | null>(null);

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
          <div
            key={b.id}
            className="cursor-pointer transition-all active:scale-[0.99]"
            onClick={() => setViewingBranch({ id: b.id, name: b.name })}
          >
            <Card className="hover:border-brand-accent/50 transition-colors h-full">
              <div className="font-display font-bold">{b.name}</div>
              <div className="text-sm text-brand-muted">{b.address ?? "—"}</div>
              <div className="tabular mt-2 text-xs text-brand-muted">{b._count.tables} {t("tablesWord")} · {b._count.users} {t("staffWord")}</div>
              <div className="mt-1 text-xs text-brand-muted">ID: <code className="rounded bg-brand-surface2 px-1 py-0.5">{b.id}</code></div>
            </Card>
          </div>
        ))}
      </div>

      {viewingBranch && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-brand-border bg-brand-surface text-brand-foreground shadow-pop">
            <div className="flex items-center justify-between border-b border-brand-border/70 px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-accentText">{viewingBranch.name} — Table QR Codes</h3>
                <p className="text-xs text-brand-muted">Manage tables and generate QR self-ordering codes.</p>
              </div>
              <button
                onClick={() => setViewingBranch(null)}
                className="text-brand-muted hover:text-white text-lg p-1.5"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <TableQRCodes branchId={viewingBranch.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
