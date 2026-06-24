"use client";
import { usePoll } from "@/components/fetcher";
import { Card, KPICard, PageHeader, EmptyState, LiveDot } from "@/components/ui";
import { ClockIcon, CoinsIcon, ReceiptIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Summary { openingFloat: number; cash: number; telebirr: number; cbe: number; total: number; count: number; expectedCash: number }

const etb = (n: number) => `${n.toLocaleString()} ETB`;

export default function CashierShift() {
  const { t } = useLang();
  const { data } = usePoll<Summary | null>("/api/cashier/shift/summary", 5000);
  if (!data) return <EmptyState icon={<ClockIcon className="h-7 w-7" />}>{t("noOpenShift")}</EmptyState>;
  return (
    <div className="space-y-5">
      <PageHeader title={t("shiftRunningTotals")}>
        <LiveDot label={t("live")} />
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KPICard label={t("openingFloat")} value={etb(data.openingFloat)} tone="blue" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label={t("cashSales")} value={etb(data.cash)} tone="green" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label={t("expectedCash")} value={etb(data.expectedCash)} tone="accent" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label="Telebirr" value={etb(data.telebirr)} tone="accent" />
        <KPICard label="CBE Birr" value={etb(data.cbe)} tone="accent" />
        <KPICard label={t("transactions")} value={String(data.count)} tone="blue" icon={<ReceiptIcon className="h-5 w-5" />} />
      </div>
      <Card><div className="text-sm text-brand-muted">Digital totals auto-reconcile via payment webhooks. Cash variance is flagged at shift close if &gt; 50 ETB.</div></Card>
    </div>
  );
}
