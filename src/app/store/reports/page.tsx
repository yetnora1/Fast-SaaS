"use client";
import { usePoll } from "@/components/fetcher";
import { Card, KPICard, PageHeader } from "@/components/ui";
import { PackageIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Report { rows: { id: string; name: string; unit: string; received: number; consumed: number; wasted: number; onHand: number; value: number }[]; valuation: number }

export default function StoreReports() {
  const { t } = useLang();
  const { data } = usePoll<Report>("/api/store/reports/consumption", 0);
  return (
    <div className="space-y-5">
      <PageHeader title={t("inventoryReports30")} />
      <KPICard label={t("stockValuation")} value={`${(data?.valuation ?? 0).toLocaleString()} ETB`} tone="green" icon={<PackageIcon className="h-5 w-5" />} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="p-2 font-medium">{t("itemCol")}</th><th className="p-2 font-medium">{t("received")}</th><th className="p-2 font-medium">{t("consumed")}</th><th className="p-2 font-medium">{t("wasted")}</th><th className="p-2 font-medium">{t("onHand")}</th><th className="p-2 font-medium">{t("value")}</th></tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.id} className="border-t border-brand-border/60">
                <td className="p-2">{r.name}</td>
                <td className="tabular p-2">{r.received} {r.unit}</td>
                <td className="tabular p-2">{r.consumed} {r.unit}</td>
                <td className="tabular p-2">{r.wasted} {r.unit}</td>
                <td className="tabular p-2">{r.onHand} {r.unit}</td>
                <td className="tabular p-2">{r.value.toLocaleString()} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
