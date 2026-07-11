"use client";
// Shared chart theming for Recharts — on-brand tooltip + palette.
// Colors are CSS variables set per light/dark theme by AppShell, so series
// stay >=3:1 against the page and gridlines stay subtle in both modes.

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
export const CHART_GRID = "var(--theme-border)";
export const CHART_AXIS = "var(--theme-muted)";

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
