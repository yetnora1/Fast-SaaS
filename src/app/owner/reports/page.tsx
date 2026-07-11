"use client";
import { usePoll } from "@/components/fetcher";
import { Card, KPICard, PageHeader, EmptyState } from "@/components/ui";
import { CoinsIcon, ReceiptIcon, ChartIcon } from "@/components/icons";
import { ChartTooltip, CHART_COLORS, CHART_GRID, CHART_AXIS } from "@/components/charts";
import { useLang } from "@/lib/i18n";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const etb = (n: number) => `${n.toLocaleString()} ETB`;

export default function ReportsPage() {
  const { t } = useLang();
  const sales = usePoll<{ revenue: number; orders: number; avgOrderValue: number; hourly: { hour: string; revenue: number }[] }>("/api/owner/reports/sales", 0);
  const vat = usePoll<{ grossSales: number; netSales: number; vatCollected: number; vatRate: number; transactionCount: number }>("/api/owner/reports/vat", 0);
  const hourly = sales.data?.hourly ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t("reportsAnalytics")} subtitle="Sales performance & tax summary" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KPICard label={t("revenueToday")} value={etb(sales.data?.revenue ?? 0)} tone="green" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label={t("ordersToday")} value={String(sales.data?.orders ?? 0)} tone="blue" icon={<ReceiptIcon className="h-5 w-5" />} />
        <KPICard label={t("avgOrderValue")} value={etb(sales.data?.avgOrderValue ?? 0)} tone="accent" icon={<ChartIcon className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-2 font-medium">{t("salesByHour")}</div>
        {hourly.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={hourly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="hour" stroke={CHART_AXIS} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={CHART_AXIS} fontSize={11} tickLine={false} axisLine={false} width={48} />
              <Tooltip cursor={{ stroke: CHART_GRID }} content={<ChartTooltip suffix=" ETB" />} />
              <Line type="monotone" dataKey="revenue" name={t("revenue")} stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={<ChartIcon className="h-7 w-7" />}>{t("noSalesYet")}</EmptyState>
        )}
      </Card>

      <Card>
        <div className="mb-3 font-medium">{t("vatReportTitle")}</div>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><div className="text-brand-muted">{t("grossSales")}</div><div className="tabular text-lg font-bold">{etb(vat.data?.grossSales ?? 0)}</div></div>
          <div><div className="text-brand-muted">{t("netPreVat")}</div><div className="tabular text-lg font-bold">{etb(vat.data?.netSales ?? 0)}</div></div>
          <div><div className="text-brand-muted">VAT ({Math.round((vat.data?.vatRate ?? 0.15) * 100)}%)</div><div className="tabular text-lg font-bold">{etb(vat.data?.vatCollected ?? 0)}</div></div>
          <div><div className="text-brand-muted">{t("transactions")}</div><div className="tabular text-lg font-bold">{vat.data?.transactionCount ?? 0}</div></div>
        </div>
      </Card>
    </div>
  );
}
