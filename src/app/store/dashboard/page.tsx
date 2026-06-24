"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Modal, StatusChip, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Item { id: string; name: string; unit: string; quantity: number; minThreshold: number; costPerUnit: number; status: string; branchId: string; supplier: { name: string } | null }

export default function StoreDashboard() {
  const { t, statusLabel } = useLang();
  const { data, reload } = usePoll<{ items: Item[] }>("/api/store/inventory", 8000);
  const forecast = usePoll<{ forecast: { id: string; hoursToStockout: number | null }[] }>("/api/store/inventory/forecast", 0);

  const [action, setAction] = useState<{ type: "receive" | "adjust"; item: Item } | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openAction(type: "receive" | "adjust", it: Item) {
    setAction({ type, item: it });
    setQty("");
    setReason("");
    setErr(null);
  }

  async function submitAction() {
    if (!action || !qty) return;
    setBusy(true);
    setErr(null);
    try {
      if (action.type === "receive") {
        await api(`/api/store/inventory/${action.item.id}/receive`, { method: "POST", body: JSON.stringify({ quantity: Number(qty) }) });
      } else {
        if (!reason) { setErr(t("reason")); setBusy(false); return; }
        await api(`/api/store/inventory/${action.item.id}/adjust`, { method: "POST", body: JSON.stringify({ delta: Number(qty), reason }) });
      }
      setAction(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const [item, setItem] = useState({ branchId: "", name: "", unit: "kg", quantity: "", minThreshold: "" });
  async function addItem() {
    await api("/api/store/inventory", {
      method: "POST",
      body: JSON.stringify({ ...item, quantity: Number(item.quantity || 0), minThreshold: Number(item.minThreshold || 0) }),
    });
    setItem({ branchId: "", name: "", unit: "kg", quantity: "", minThreshold: "" });
    reload();
  }

  const hoursById = new Map(forecast.data?.forecast.map((f) => [f.id, f.hoursToStockout]));

  return (
    <div className="space-y-5">
      <PageHeader title={t("inventoryOverview")} />

      <Card className="space-y-2">
        <div className="font-medium">{t("addIngredient")}</div>
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder={t("branchIdPlaceholder")} value={item.branchId} onChange={(e) => setItem({ ...item, branchId: e.target.value })} />
          <Input placeholder={t("name")} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          <Input placeholder={t("unit")} value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} />
          <Input placeholder={t("qty")} type="number" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} />
          <Input placeholder={t("minThreshold")} type="number" value={item.minThreshold} onChange={(e) => setItem({ ...item, minThreshold: e.target.value })} />
        </div>
        <Button onClick={addItem} disabled={!item.branchId || !item.name}>{t("add")}</Button>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="p-2 font-medium">{t("itemCol")}</th><th className="p-2 font-medium">{t("qty")}</th><th className="p-2 font-medium">{t("min")}</th><th className="p-2 font-medium">{t("status")}</th><th className="p-2 font-medium">{t("stockout")}</th><th className="p-2 font-medium">{t("supplier")}</th><th className="p-2 font-medium">{t("actions")}</th></tr>
          </thead>
          <tbody>
            {data?.items.map((i) => {
              const hrs = hoursById.get(i.id);
              return (
                <tr key={i.id} className="border-t border-brand-border/60">
                  <td className="p-2">{i.name}</td>
                  <td className="tabular p-2">{i.quantity} {i.unit}</td>
                  <td className="tabular p-2">{i.minThreshold}</td>
                  <td className="p-2"><StatusChip status={i.status} /></td>
                  <td className="tabular p-2">{hrs != null ? `~${hrs}h` : "—"}</td>
                  <td className="p-2 text-brand-muted">{i.supplier?.name ?? "—"}</td>
                  <td className="flex gap-1 p-2">
                    <Button variant="ghost" size="sm" onClick={() => openAction("receive", i)}>{t("receive")}</Button>
                    <Button variant="ghost" size="sm" onClick={() => openAction("adjust", i)}>{t("adjust")}</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={`${action?.type === "receive" ? t("receiveDelivery") : t("adjustStock")} · ${action?.item.name ?? ""}`}
      >
        <div className="space-y-3">
          <Input
            type="number"
            placeholder={action?.type === "receive" ? t("quantityReceived") : t("adjustmentQty")}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          {action?.type === "adjust" && <Input placeholder={t("reason")} value={reason} onChange={(e) => setReason(e.target.value)} />}
          {err && <p className="text-sm text-status-red">{err}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAction(null)}>{t("cancel")}</Button>
            <Button className="flex-1" onClick={submitAction} disabled={!qty || busy}>{t("confirm")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
