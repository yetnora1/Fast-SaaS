"use client";
// Shared chart theming for Recharts — dark on-brand tooltip + palette.

export const CHART_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#A855F7", "#14B8A6", "#EF4444"];
export const CHART_GRID = "#22304A";
export const CHART_AXIS = "#64748B";

/** Dark, on-brand tooltip for all charts (skill: tooltips show exact values). */
export function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs shadow-pop">
      {label != null && <div className="mb-1 font-medium text-brand-foreground">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-brand-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-brand-foreground">{p.name}:</span>
          <span className="tabular font-medium text-brand-foreground">
            {Number(p.value).toLocaleString()}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}
