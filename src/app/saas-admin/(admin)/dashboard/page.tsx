"use client";
import { usePoll } from "@/components/fetcher";
import { KPICard, PageHeader, SkeletonCard, Card } from "@/components/ui";
import {
  UsersIcon,
  CoinsIcon,
  ChartIcon,
  ClockIcon,
  StoreIcon,
  ClipboardIcon,
  ReceiptIcon,
} from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface SubscriptionActivity {
  id: string;
  tenantName: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface Metrics {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  expiringSoon: number;
  pendingApprovals: number;
  mrr: number;
  arr: number;
  activity: {
    totalBranches: number;
    totalMenuItems: number;
    totalOrders: number;
    totalGmv: number;
  };
  breakdown: {
    active: number;
    trialing: number;
    expired: number;
    suspended: number;
  };
  recentSubscriptions: SubscriptionActivity[];
}

export default function SaasDashboard() {
  const { t } = useLang();
  const { data, loading } = usePoll<Metrics>("/api/saas/metrics", 15000);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("platformOverview")} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const breakdownTotal =
    data.breakdown.active +
    data.breakdown.trialing +
    data.breakdown.expired +
    data.breakdown.suspended || 1;

  const pct = (val: number) => Math.round((val / breakdownTotal) * 100);

  const statusColors: Record<string, string> = {
    APPROVED: "bg-status-green/15 text-status-green",
    PENDING: "bg-status-yellow/15 text-status-yellow",
    REJECTED: "bg-status-red/15 text-status-red",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("platformOverview")}
        subtitle="Real-time SaaS billing and platform activity overview"
      />

      {/* Row 1: Core Financials & Tenants KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label={t("activeTenants")}
          value={String(data.activeTenants)}
          tone="green"
          icon={<UsersIcon className="h-5 w-5" />}
          delta={`${data.trialingTenants} ${t("onTrial")}`}
        />
        <KPICard
          label="MRR"
          value={`${data.mrr.toLocaleString()} ETB`}
          tone="accent"
          icon={<CoinsIcon className="h-5 w-5" />}
        />
        <KPICard
          label="ARR"
          value={`${data.arr.toLocaleString()} ETB`}
          tone="blue"
          icon={<ChartIcon className="h-5 w-5" />}
        />
        <KPICard
          label={t("pendingApprovalsKpi")}
          value={String(data.pendingApprovals)}
          tone="yellow"
          icon={<ClockIcon className="h-5 w-5" />}
          delta={`${data.expiringSoon} ${t("expiring30")}`}
        />
      </div>

      {/* Row 2: Platform Operational Activity */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">
          {t("platformActivity")}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label={t("gtvKpi")}
            value={`${data.activity.totalGmv.toLocaleString()} ETB`}
            tone="accent"
            icon={<CoinsIcon className="h-5 w-5" />}
          />
          <KPICard
            label={t("totalOrdersKpi")}
            value={String(data.activity.totalOrders)}
            tone="blue"
            icon={<ReceiptIcon className="h-5 w-5" />}
          />
          <KPICard
            label={t("totalBranchesKpi")}
            value={String(data.activity.totalBranches)}
            tone="green"
            icon={<StoreIcon className="h-5 w-5" />}
          />
          <KPICard
            label={t("totalMenuKpi")}
            value={String(data.activity.totalMenuItems)}
            tone="yellow"
            icon={<ClipboardIcon className="h-5 w-5" />}
          />
        </div>
      </div>

      {/* Row 3: Breakdown & Subscriptions Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tenant Status Distribution */}
        <Card className="space-y-6 p-5">
          <div>
            <h3 className="text-lg font-bold text-brand-foreground">{t("tenantBreakdown")}</h3>
            <p className="text-xs text-brand-muted">Distribution across {data.totalTenants} registered tenants</p>
          </div>

          <div className="space-y-4">
            {/* Active Tenants Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-status-green">{t("activeLabel")}</span>
                <span className="text-brand-foreground">{data.breakdown.active} ({pct(data.breakdown.active)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-brand-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-status-green transition-all duration-500"
                  style={{ width: `${pct(data.breakdown.active)}%` }}
                />
              </div>
            </div>

            {/* Trialing Tenants Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-status-yellow">{t("trialingLabel")}</span>
                <span className="text-brand-foreground">{data.breakdown.trialing} ({pct(data.breakdown.trialing)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-brand-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-status-yellow transition-all duration-500"
                  style={{ width: `${pct(data.breakdown.trialing)}%` }}
                />
              </div>
            </div>

            {/* Expired Tenants Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-status-red">{t("expiredLabel")}</span>
                <span className="text-brand-foreground">{data.breakdown.expired} ({pct(data.breakdown.expired)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-brand-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-status-red transition-all duration-500"
                  style={{ width: `${pct(data.breakdown.expired)}%` }}
                />
              </div>
            </div>

            {/* Suspended Tenants Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-brand-muted">{t("suspendedLabel")}</span>
                <span className="text-brand-foreground">{data.breakdown.suspended} ({pct(data.breakdown.suspended)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-brand-surface2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-muted transition-all duration-500"
                  style={{ width: `${pct(data.breakdown.suspended)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Subscriptions activity feed */}
        <Card className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-bold text-brand-foreground">{t("recentSubscriptionsTitle")}</h3>
            <p className="text-xs text-brand-muted">Latest subscription receipt actions and states</p>
          </div>

          <div className="divide-y divide-brand-border/40">
            {data.recentSubscriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-brand-muted">No subscription logs found.</div>
            ) : (
              data.recentSubscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-brand-foreground">{s.tenantName}</div>
                    <div className="text-[10px] text-brand-muted">
                      {new Date(s.createdAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular text-brand-foreground">
                      {s.amount.toLocaleString()} ETB
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        statusColors[s.status] || "bg-white/10 text-brand-muted"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
