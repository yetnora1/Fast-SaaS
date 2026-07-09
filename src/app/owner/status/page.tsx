"use client";
import { usePoll } from "@/components/fetcher";
import { PageHeader, EmptyState, Spinner } from "@/components/ui";
import { CafeStatusContent, StatusData } from "@/components/CafeStatusFAB";
import { useLang } from "@/lib/i18n";

export default function StandaloneStatusPage() {
  const { lang } = useLang();
  const { data, loading } = usePoll<StatusData>("/api/owner/status", 15000);

  const healthScore = data
    ? Math.min(100, Math.max(0,
        (data.today.margin > 0 ? 25 : 0) +
        (data.purchases.credit === 0 ? 20 : data.purchases.credit < 5000 ? 10 : 0) +
        (data.inventory.lowStock === 0 ? 20 : data.inventory.lowStock <= 2 ? 10 : 0) +
        (data.equipment.needsRepair === 0 ? 15 : 0) +
        (data.staff.activeToday > 0 ? 20 : 0)
      ))
    : 0;

  const healthColor =
    healthScore >= 80 ? "text-status-green" :
    healthScore >= 50 ? "text-status-yellow" :
    "text-status-red";

  const healthLabel =
    healthScore >= 80 ? (lang === "am" ? "ጥሩ" : "Excellent") :
    healthScore >= 50 ? (lang === "am" ? "መካከለኛ" : "Moderate") :
    (lang === "am" ? "ትኩረት ያስፈልጋል" : "Needs Attention");

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-start justify-between">
        <PageHeader
          title={lang === "am" ? "☕ የካፌ ሁኔታ" : "☕ Cafe Status"}
          subtitle={lang === "am" ? "ሙሉ የካፌ አፈጻጸም እና ዝርዝር መረጃ" : "Complete business operations overview"}
        />
        {data && (
          <div className="text-right bg-brand-surface p-3.5 rounded-2xl border border-brand-border shadow-sm">
            <p className={`text-3xl font-black tracking-tight tabular ${healthColor}`}>{healthScore}%</p>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${healthColor} mt-0.5`}>{healthLabel}</p>
          </div>
        )}
      </div>

      {data && (
        <div className="h-3 w-full overflow-hidden rounded-full bg-brand-border">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              healthScore >= 80 ? "bg-gradient-to-r from-status-green to-emerald-400" :
              healthScore >= 50 ? "bg-gradient-to-r from-status-yellow to-amber-400" :
              "bg-gradient-to-r from-status-red to-rose-400"
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : data ? (
        /* Reuses the exact same detailed sub-metrics component, rendered inline */
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-sm">
          <CafeStatusContent d={data} lang={lang} />
        </div>
      ) : (
        <EmptyState>{lang === "am" ? "ዳታ ማግኘት አልተቻለም" : "Unable to load status"}</EmptyState>
      )}
    </div>
  );
}
