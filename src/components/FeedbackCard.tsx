"use client";
import { usePoll } from "@/components/fetcher";
import { Card, EmptyState } from "@/components/ui";
import { StarIcon, MessageCircleIcon, CoffeeIcon, ChefHatIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface FeedbackItem {
  orderId: string;
  rating: number;
  comment: string | null;
  table: number | null;
  branch: string;
  time: string;
  items: { name: string; nameAm: string | null; station: string; qty: number }[];
}

interface FeedbackStats {
  total: number;
  average: number;
  distribution: number[];
}

/**
 * Reusable feedback card component used in owner, manager, barista, and kitchen dashboards.
 * The API automatically filters feedback based on the user's role + station.
 */
export function FeedbackCard({ station }: { station?: "BARISTA" | "KITCHEN" | "ALL" }) {
  const { t, lang } = useLang();
  const { data } = usePoll<{ feedback: FeedbackItem[]; stats: FeedbackStats }>("/api/feedback", 10000);

  if (!data) return null;

  const { feedback, stats } = data;
  const stationLabel = station === "BARISTA" ? (lang === "am" ? "ከመጠጥ" : "Drinks") : station === "KITCHEN" ? (lang === "am" ? "ከምግብ" : "Food") : (lang === "am" ? "ሁሉም" : "All");

  return (
    <Card className="relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-brand-accent/10 blur-3xl" />

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-status-yellowText">
            <MessageCircleIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-brand-foreground">
              {lang === "am" ? "የደንበኛ ግብረ መልስ" : "Customer Feedback"}
            </h3>
            <p className="text-xs text-brand-muted">
              {lang === "am" ? `ዛሬ · ${stationLabel}` : `Today · ${stationLabel}`}
            </p>
          </div>
        </div>
        {stats.total > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-4 w-4 text-status-yellowText" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-display text-sm font-bold text-status-yellowText">{stats.average}</span>
            <span className="text-xs text-status-yellowText/60">({stats.total})</span>
          </div>
        )}
      </div>

      {/* Star Distribution Bar */}
      {stats.total > 0 && (
        <div className="relative mb-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star - 1];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right tabular text-brand-muted">{star}</span>
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-3 w-3 text-status-yellowText/70" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-foreground/10">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: star >= 4 ? "var(--status-green-text, #0d7d6c)" : star === 3 ? "var(--status-yellow-text, #B45309)" : "var(--status-red-text, #B91C1C)",
                    }}
                  />
                </div>
                <span className="w-5 text-right tabular text-brand-muted">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback Items */}
      {feedback.length === 0 ? (
        <EmptyState icon={<StarIcon className="h-7 w-7" />}>
          {lang === "am" ? "ዛሬ ምንም ግብረ መልስ የለም" : "No feedback today yet"}
        </EmptyState>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          {feedback.map((fb) => (
            <div
              key={fb.orderId}
              className="group relative rounded-xl border border-brand-border/50 bg-gradient-to-br from-white/[0.03] to-transparent p-3 transition-all duration-300 hover:border-brand-border hover:bg-white/[0.05]"
            >
              {/* Rating + Meta */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      viewBox="0 0 24 24"
                      fill={s <= fb.rating ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className={`h-4 w-4 transition-colors ${s <= fb.rating ? "text-status-yellowText" : "text-brand-foreground/15"}`}
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  {fb.table != null && (
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5">
                      {lang === "am" ? `ጠረጴዛ ${fb.table}` : `T${fb.table}`}
                    </span>
                  )}
                  <span>{new Date(fb.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Comment */}
              {fb.comment && (
                <p className="mb-2 text-sm leading-relaxed text-brand-foreground/90 italic">
                  &ldquo;{fb.comment}&rdquo;
                </p>
              )}

              {/* Items with station badges */}
              <div className="flex flex-wrap gap-1.5">
                {fb.items.map((item, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                      item.station === "BARISTA"
                        ? "bg-sky-500/10 text-status-blueText border border-sky-500/20"
                        : "bg-orange-500/10 text-status-yellowText border border-orange-500/20"
                    }`}
                  >
                    {item.station === "BARISTA" ? (
                      <CoffeeIcon className="h-3 w-3" />
                    ) : (
                      <ChefHatIcon className="h-3 w-3" />
                    )}
                    {item.qty > 1 && `${item.qty}× `}
                    {lang === "am" && item.nameAm ? item.nameAm : item.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
