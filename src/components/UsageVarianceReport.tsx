"use client";
import { useState } from "react";
import { usePoll } from "@/components/fetcher";
import { Card, PageHeader, EmptyState, Select, Spinner } from "@/components/ui";
import { PackageIcon, AlertTriangleIcon, CheckCircleIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface Row {
  ingredientId: string;
  name: string;
  baseUnit: "KG" | "L" | "PIECE";
  expected: number;
  actual: number;
  variance: number;
  varianceValue: number;
}

const UNIT_LABEL: Record<Row["baseUnit"], string> = { KG: "kg", L: "L", PIECE: "pcs" };
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 3 });

/**
 * Theoretical vs actual ingredient usage.
 *
 * "Expected" is what the recipes say the period's sales consumed. "Issued" is
 * what the store actually sent out. The gap is waste, over-pouring or loss —
 * invisible until the two numbers sit side by side.
 */
export function UsageVarianceReport() {
  const [days, setDays] = useState(30);
  const { data, loading } = usePoll<{ rows: Row[]; totalVarianceValue: number; days: number }>(
    `/api/owner/reports/usage-variance?days=${days}`,
    60000,
  );

  const rows = data?.rows ?? [];
  const total = data?.totalVarianceValue ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ingredient usage"
        subtitle="What your recipes say you should have used, next to what the store actually issued."
      >
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-auto" aria-label="Period">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </PageHeader>

      {loading && !data && <div className="flex justify-center py-10"><Spinner /></div>}

      {data && rows.length === 0 && (
        <EmptyState icon={<PackageIcon className="h-7 w-7" />}>
          Nothing to compare yet. Add recipes to your menu items and issue stock from the store.
        </EmptyState>
      )}

      {rows.length > 0 && (
        <>
          <Card className={cn("flex flex-wrap items-center justify-between gap-3 p-4", Math.abs(total) > 0 && "border-brand-accent/40")}>
            <div className="flex items-center gap-3">
              <span className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                total > 0 ? "bg-status-red/12 text-status-redText" : "bg-status-green/12 text-status-greenText",
              )}>
                {total > 0 ? <AlertTriangleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
              </span>
              <div>
                <div className="text-sm font-bold text-brand-foreground">
                  {total > 0 ? "More issued than sales account for" : "Usage is in line with sales"}
                </div>
                <div className="text-xs text-brand-muted">
                  Over the last {data?.days} days, across {rows.length} ingredient{rows.length === 1 ? "" : "s"}.
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("tabular text-xl font-bold", total > 0 ? "text-status-redText" : "text-status-greenText")}>
                {total > 0 ? "+" : ""}{money(total)} ETB
              </div>
              <div className="text-[11px] text-brand-muted">unaccounted value</div>
            </div>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left text-[11px] uppercase tracking-wider text-brand-muted">
                  <th className="px-4 py-3 font-bold">Ingredient</th>
                  <th className="px-4 py-3 text-right font-bold">Expected</th>
                  <th className="px-4 py-3 text-right font-bold">Issued</th>
                  <th className="px-4 py-3 text-right font-bold">Difference</th>
                  <th className="px-4 py-3 text-right font-bold">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ingredientId} className="border-b border-brand-border/40 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-foreground">{r.name}</td>
                    <td className="tabular px-4 py-3 text-right text-brand-muted">{qty(r.expected)} {UNIT_LABEL[r.baseUnit]}</td>
                    <td className="tabular px-4 py-3 text-right text-brand-muted">{qty(r.actual)} {UNIT_LABEL[r.baseUnit]}</td>
                    <td className={cn(
                      "tabular px-4 py-3 text-right font-semibold",
                      r.variance > 0 ? "text-status-redText" : r.variance < 0 ? "text-status-greenText" : "text-brand-muted",
                    )}>
                      {r.variance > 0 ? "+" : ""}{qty(r.variance)} {UNIT_LABEL[r.baseUnit]}
                    </td>
                    <td className={cn(
                      "tabular px-4 py-3 text-right font-semibold",
                      r.varianceValue > 0 ? "text-status-redText" : r.varianceValue < 0 ? "text-status-greenText" : "text-brand-muted",
                    )}>
                      {r.varianceValue > 0 ? "+" : ""}{money(r.varianceValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <p className="text-xs leading-6 text-brand-muted">
            A positive difference means the store issued more than the recipes account for — waste, over-pouring or loss.
            Stock levels are not changed by this report; goods issues remain the only thing that moves them.
          </p>
        </>
      )}
    </div>
  );
}
