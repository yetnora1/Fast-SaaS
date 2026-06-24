"use client";
import { usePoll } from "@/components/fetcher";
import { KPICard, PageHeader, SkeletonCard } from "@/components/ui";
import { UsersIcon, CoinsIcon, ChartIcon, ClockIcon, StoreIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Metrics {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  expiringSoon: number;
  pendingApprovals: number;
  mrr: number;
  arr: number;
}

export default function SaasDashboard() {
  const { t } = useLang();
  const { data, loading } = usePoll<Metrics>("/api/saas/metrics", 15000);
  if (loading || !data)
    return (
      <div className="space-y-5">
        <PageHeader title={t("platformOverview")} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  return (
    <div className="space-y-5">
      <PageHeader title={t("platformOverview")} subtitle="Tenant & revenue metrics across the platform" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label={t("activeTenants")} value={String(data.activeTenants)} tone="green" icon={<UsersIcon className="h-5 w-5" />} delta={`${data.trialingTenants} ${t("onTrial")}`} />
        <KPICard label="MRR" value={`${data.mrr.toLocaleString()} ETB`} tone="accent" icon={<CoinsIcon className="h-5 w-5" />} />
        <KPICard label="ARR" value={`${data.arr.toLocaleString()} ETB`} tone="blue" icon={<ChartIcon className="h-5 w-5" />} />
        <KPICard label={t("pendingApprovalsKpi")} value={String(data.pendingApprovals)} tone="yellow" icon={<ClockIcon className="h-5 w-5" />} delta={`${data.expiringSoon} ${t("expiring30")}`} />
      </div>
      <KPICard label={t("totalTenantsAllTime")} value={String(data.totalTenants)} tone="blue" icon={<StoreIcon className="h-5 w-5" />} />
    </div>
  );
}
