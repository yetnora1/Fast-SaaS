"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, KPICard, PageHeader } from "@/components/ui";
import { CoinsIcon, ReceiptIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Current { shift: { id: string; openingFloat: string; openTime: string }; totals: { cash: number; telebirr: number; cbe: number; total: number; count: number } }

export default function ShiftPage() {
  const { t } = useLang();
  const { data, reload } = usePoll<Current | null>("/api/manager/shifts/current", 6000);
  const [float, setFloat] = useState("");
  const [actual, setActual] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function open() {
    await api("/api/manager/shifts/open", { method: "POST", body: JSON.stringify({ openingFloat: Number(float) }) });
    setFloat("");
    reload();
  }
  async function close() {
    if (!data) return;
    const res = await api<{ variance: number; expectedCash: number }>("/api/manager/shifts/close", {
      method: "POST",
      body: JSON.stringify({ shiftId: data.shift.id, actualCash: Number(actual) }),
    });
    setResult(`Closed. Expected ${res.expectedCash} ETB, variance ${res.variance} ETB${Math.abs(res.variance) > 50 ? " (⚠ owner notified)" : ""}`);
    reload();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title={t("shiftManagement")} />
      {!data ? (
        <Card className="space-y-2">
          <div className="font-medium">{t("openShiftTitle")}</div>
          <Input placeholder={t("openingFloatPlaceholder")} type="number" value={float} onChange={(e) => setFloat(e.target.value)} />
          <Button onClick={open} disabled={!float}>{t("openShiftBtn")}</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard label={t("openingFloat")} value={`${Number(data.shift.openingFloat).toLocaleString()} ETB`} tone="blue" icon={<CoinsIcon className="h-5 w-5" />} />
            <KPICard label={t("cashSales")} value={`${data.totals.cash.toLocaleString()} ETB`} tone="green" icon={<CoinsIcon className="h-5 w-5" />} />
            <KPICard label={t("digital")} value={`${(data.totals.telebirr + data.totals.cbe).toLocaleString()} ETB`} tone="accent" />
            <KPICard label={t("transactions")} value={String(data.totals.count)} tone="blue" icon={<ReceiptIcon className="h-5 w-5" />} />
          </div>
          <Card className="space-y-2">
            <div className="font-medium">{t("closeShiftReconcile")}</div>
            <div className="tabular text-sm text-brand-muted">{t("expectedCash")}: {(Number(data.shift.openingFloat) + data.totals.cash).toLocaleString()} ETB</div>
            <Input placeholder={t("actualCashPlaceholder")} type="number" value={actual} onChange={(e) => setActual(e.target.value)} />
            <Button onClick={close} disabled={!actual}>{t("countCloseBtn")}</Button>
            {result && <p className="text-sm text-brand-accentText">{result}</p>}
          </Card>
        </>
      )}
    </div>
  );
}
