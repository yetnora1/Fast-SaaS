"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { PackageIcon, ChefHatIcon, CoffeeIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface InvItem { id: string; name: string; unit: string; quantity: number; branchId: string }
interface Issue {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  destination: "KITCHEN" | "BARISTA";
  status: "ISSUED" | "RECEIVED";
  note: string | null;
  issuedAt: string;
  receivedAt: string | null;
  issuedBy: { name: string } | null;
  receivedBy: { name: string } | null;
}

export default function StoreIssuesPage() {
  const { t, statusLabel } = useLang();
  const inventory = usePoll<{ items: InvItem[] }>("/api/store/inventory", 0);
  const ledger = usePoll<{ issues: Issue[] }>("/api/store/issues", 8000);

  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [destination, setDestination] = useState<"KITCHEN" | "BARISTA">("KITCHEN");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const items = inventory.data?.items ?? [];
  const selected = items.find((i) => i.id === itemId);

  async function submit() {
    if (!itemId || !qty) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await api("/api/store/issues", {
        method: "POST",
        body: JSON.stringify({ itemId, quantity: Number(qty), destination, note: note.trim() || undefined }),
      });
      setOkMsg(`${qty} ${selected?.unit ?? ""} ${selected?.name ?? ""} → ${destination === "KITCHEN" ? t("kitchenDest") : t("baristaDest")}`);
      setQty("");
      setNote("");
      ledger.reload();
      inventory.reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const destBtn = (d: "KITCHEN" | "BARISTA", icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setDestination(d)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
        destination === d
          ? "border-brand-accent bg-brand-accent/15 text-brand-accent"
          : "border-brand-border bg-brand-surface2 text-brand-muted hover:text-brand-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("issueGoodsTitle")} subtitle={t("issueGoodsSubtitle")} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Issue form */}
        <Card className="space-y-3 self-start">
          <Field label={t("itemCol")} required>
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">{t("selectItemPh")}</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.quantity} {i.unit} {t("inStockSuffix")}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`${t("qty")}${selected ? ` (${selected.unit})` : ""}`} required>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
              />
              {selected && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-brand-muted">
                  {selected.unit}
                </span>
              )}
            </div>
          </Field>

          <Field label={t("destinationLabel")} required>
            <div className="flex gap-2">
              {destBtn("KITCHEN", <ChefHatIcon className="h-4 w-4" />, t("kitchenDest"))}
              {destBtn("BARISTA", <CoffeeIcon className="h-4 w-4" />, t("baristaDest"))}
            </div>
          </Field>

          <Field label={t("noteOptional")}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="…" />
          </Field>

          {err && <p className="text-sm text-status-red">{err}</p>}
          {okMsg && <p className="text-sm text-status-green">✓ {okMsg}</p>}

          <Button className="w-full" onClick={submit} loading={busy} disabled={!itemId || !qty || Number(qty) <= 0}>
            <PackageIcon className="h-4 w-4" />
            {t("issueBtn")}
          </Button>
        </Card>

        {/* Permanent ledger */}
        <Card className="lg:col-span-2">
          <div className="mb-3 font-medium">{t("transferLedger")}</div>
          {(ledger.data?.issues ?? []).length === 0 ? (
            <EmptyState icon={<PackageIcon className="h-7 w-7" />}>{t("noTransfersYet")}</EmptyState>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wide text-brand-muted">
                    <th className="px-2 py-2 font-medium">{t("dateTime")}</th>
                    <th className="px-2 py-2 font-medium">{t("itemCol")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("qty")}</th>
                    <th className="px-2 py-2 font-medium">{t("destinationLabel")}</th>
                    <th className="px-2 py-2 font-medium">{t("issuedByLabel")}</th>
                    <th className="px-2 py-2 font-medium">{t("status")}</th>
                    <th className="px-2 py-2 font-medium">{t("receivedByLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data!.issues.map((i) => (
                    <tr key={i.id} className="border-b border-brand-border/50 hover:bg-white/5">
                      <td className="whitespace-nowrap px-2 py-2 text-brand-muted">{new Date(i.issuedAt).toLocaleString()}</td>
                      <td className="px-2 py-2 font-medium">
                        {i.itemName}
                        {i.note && <div className="text-xs font-normal text-brand-muted">{i.note}</div>}
                      </td>
                      <td className="tabular whitespace-nowrap px-2 py-2 text-right font-semibold">{i.quantity} {i.unit}</td>
                      <td className="px-2 py-2">{i.destination === "KITCHEN" ? t("kitchenDest") : t("baristaDest")}</td>
                      <td className="px-2 py-2 text-brand-muted">{i.issuedBy?.name ?? "—"}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          i.status === "RECEIVED" ? "bg-status-green/15 text-status-green" : "bg-status-yellow/15 text-status-yellow"
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel(i.status)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-brand-muted">
                        {i.receivedBy?.name ?? "—"}
                        {i.receivedAt && <div className="text-xs">{new Date(i.receivedAt).toLocaleTimeString()}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
