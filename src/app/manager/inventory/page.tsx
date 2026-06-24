"use client";
import { usePoll } from "@/components/fetcher";
import { Card, StatusChip, PageHeader, EmptyState } from "@/components/ui";
import { CheckCircleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Alert { id: string; name: string; quantity: number; minThreshold: number; unit: string; status: string }

export default function ManagerInventory() {
  const { t } = useLang();
  const { data } = usePoll<{ alerts: Alert[] }>("/api/manager/inventory/alerts", 10000);
  return (
    <div className="space-y-5">
      <PageHeader title={t("lowStockAlerts")} />
      <Card>
        {data?.alerts.length === 0 && <EmptyState icon={<CheckCircleIcon className="h-7 w-7" />}>{t("allStockAbove")}</EmptyState>}
        <div className="space-y-1 text-sm">
          {data?.alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-t border-brand-border/60 py-2 first:border-t-0">
              <span>{a.name}</span>
              <span className="flex items-center gap-2">
                <span className="tabular text-brand-muted">{a.quantity}/{a.minThreshold} {a.unit}</span>
                <StatusChip status={a.status} />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
