"use client";
import { useState } from "react";
import { usePoll } from "@/components/fetcher";
import { Card, KPICard, PageHeader, LiveDot, StatusChip, EmptyState, SkeletonCard, Skeleton, Button, Modal } from "@/components/ui";
import { AlertTriangleIcon, CoinsIcon, TrendUpIcon, ReceiptIcon, CheckCircleIcon, PackageIcon } from "@/components/icons";
import { ChartTooltip, CHART_COLORS, CHART_GRID, CHART_AXIS } from "@/components/charts";
import { FeedbackCard } from "@/components/FeedbackCard";
import { TableQRCodes } from "@/components/TableQR";
import { useLang } from "@/lib/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Dash {
  kpis: {
    revenue: number;
    netProfit: number;
    orders: number;
    completedOrders: number;
    paymentBreakdown: Record<string, number>;
    topItems: { name: string; qty: number; revenue: number }[];
  };
  branches: { name: string; revenue: number; orders: number; margin: number }[];
  lowStock: { id: string; name: string; quantity: number; minThreshold: number; status: string; unit: string }[];
}

const PAY_COLORS = CHART_COLORS;

const etb = (n: number) => `${n.toLocaleString()} ETB`;

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Today's overview" subtitle="Live performance across all branches" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { t } = useLang();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const { data, loading } = usePoll<Dash>("/api/owner/dashboard", 15000);
  if (loading || !data) return <DashboardSkeleton />;

  const pieData = Object.entries(data.kpis.paymentBreakdown).map(([name, value]) => ({ name, value }));
  const hasPayments = pieData.some((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("todaysOverview")} subtitle="Live performance across all branches">
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsQrModalOpen(true)} variant="ghost" size="sm" className="font-semibold tracking-wider">
            📱 QR CODE
          </Button>
          <LiveDot label={t("live")} />
        </div>
      </PageHeader>

      <Modal open={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Table QR Codes" className="max-w-4xl">
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <TableQRCodes />
        </div>
      </Modal>

      {data.lowStock.length > 0 && (
        <Card className="border-status-red/40 bg-status-red/10">
          <div className="flex items-center gap-2 font-medium text-status-redText">
            <AlertTriangleIcon className="h-5 w-5" />
            {t("criticalStock")}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {data.lowStock.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-bg/40 px-2.5 py-1.5"
              >
                <span className="text-brand-foreground">{s.name}</span>
                <span className="tabular text-brand-muted">
                  {s.quantity}
                  {s.unit}
                </span>
                <StatusChip status={s.status} />
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label={t("revenue")} value={etb(data.kpis.revenue)} tone="green" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label={t("netProfit")} value={etb(data.kpis.netProfit)} tone="accent" icon={<TrendUpIcon className="h-5 w-5" />} />
        <KPICard label={t("ordersKpi")} value={String(data.kpis.orders)} tone="blue" icon={<ReceiptIcon className="h-5 w-5" />} />
        <KPICard
          label={t("completed")}
          value={String(data.kpis.completedOrders)}
          tone="green"
          icon={<CheckCircleIcon className="h-5 w-5" />}
          delta={data.kpis.orders > 0 ? `${Math.round((data.kpis.completedOrders / data.kpis.orders) * 100)}%` : undefined}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <div className="mb-3 font-medium text-brand-foreground">{t("paymentMethods")}</div>
          {hasPayments ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip suffix=" ETB" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState>{t("noPaymentsToday")}</EmptyState>
          )}
          {hasPayments && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {pieData.map((d, i) => (
                <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} />
                  {d.name}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-3 font-medium text-brand-foreground">{t("branchComparison")}</div>
          {data.branches.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.branches} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={CHART_AXIS} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_AXIS} fontSize={12} tickLine={false} axisLine={false} width={48} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip suffix=" ETB" />} />
                <Bar dataKey="revenue" name={t("revenue")} fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState>{t("noSalesYet")}</EmptyState>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 font-medium text-brand-foreground">{t("topSellingItems")}</div>
        {data.kpis.topItems.length === 0 ? (
          <EmptyState icon={<PackageIcon className="h-7 w-7" />}>{t("noSalesYet")}</EmptyState>
        ) : (
          <ol className="space-y-1">
            {data.kpis.topItems.map((it, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/5"
              >
                <span className="flex items-center gap-3">
                  <span className="tabular flex h-6 w-6 items-center justify-center rounded-md bg-brand-accent/15 text-xs font-bold text-brand-accentText">
                    {i + 1}
                  </span>
                  <span className="text-brand-foreground">{it.name}</span>
                </span>
                <span className="tabular text-brand-muted">
                  {it.qty} {t("sold")} · {etb(it.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Customer Feedback — all branches */}
      <FeedbackCard station="ALL" />
    </div>
  );
}
