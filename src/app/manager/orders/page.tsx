"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Modal, StatusChip, TimerBadge, PageHeader, LiveDot } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Order { id: string; status: string; submittedAt: string | null; table: { number: number } | null; items: { id: string; menuItem: { name: string; nameAm?: string | null }; status: string }[] }

export default function ManagerOrders() {
  const { t, tr, statusLabel } = useLang();
  const { data, reload } = usePoll<{ orders: Order[] }>("/api/manager/orders/live", 4000);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openVoid(id: string) {
    setVoidId(id);
    setPin("");
    setReason("");
    setErr(null);
  }

  async function confirmVoid() {
    if (!voidId || !pin || !reason) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/manager/orders/${voidId}/void`, { method: "PATCH", body: JSON.stringify({ pin, reason }) });
      setVoidId(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("liveOrderBoard")}>
        <LiveDot label={t("live")} />
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-3">
        {data?.orders.map((o) => (
          <Card key={o.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold">{t("table")} {o.table?.number ?? "—"}</span>
              {o.submittedAt && <TimerBadge since={o.submittedAt} />}
            </div>
            <StatusChip status={o.status} />
            <ul className="space-y-0.5 text-sm">
              {o.items.map((it) => (
                <li key={it.id} className="flex justify-between"><span>{tr(it.menuItem.name, it.menuItem.nameAm)}</span><span className="text-xs text-brand-muted">{statusLabel(it.status)}</span></li>
              ))}
            </ul>
            <Button variant="danger" onClick={() => openVoid(o.id)}>{t("voidPin")}</Button>
          </Card>
        ))}
      </div>

      <Modal open={!!voidId} onClose={() => setVoidId(null)} title={t("voidOrderTitle")}>
        <div className="space-y-3">
          <Input placeholder={t("managerPin")} inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          <Input placeholder={t("reasonForVoid")} value={reason} onChange={(e) => setReason(e.target.value)} />
          {err && <p className="text-sm text-status-redText">{err}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setVoidId(null)}>{t("cancel")}</Button>
            <Button variant="danger" className="flex-1" onClick={confirmVoid} disabled={!pin || !reason || busy}>{t("confirmVoid")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
