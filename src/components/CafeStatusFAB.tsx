"use client";
import { useState } from "react";
import { usePoll } from "@/components/fetcher";
import {
  Card,
  KPICard,
  EmptyState,
  Modal,
  Spinner,
} from "@/components/ui";
import {
  CoinsIcon,
  PackageIcon,
  CheckCircleIcon,
  UsersIcon,
  AlertTriangleIcon,
  TrendUpIcon,
} from "@/components/icons";
import { useLang } from "@/lib/i18n";

/* ── Types ────────────────────────────────────────── */
export interface StatusData {
  today: { revenue: number; cost: number; profit: number; margin: number; orders: number; completed: number; pending: number };
  month: { revenue: number; cost: number; profit: number; margin: number; orders: number; revenueLastMonth: number; growth: number };
  payments: Record<string, number>;
  purchases: { total: number; paid: number; credit: number; creditOrders: number; orderCount: number };
  staff: { total: number; activeToday: number };
  inventory: { total: number; lowStock: number; value: number };
  equipment: { total: number; needsRepair: number };
  branches: number;
  menu: { items: number; categories: number };
  suppliers: number;
  topItems: { name: string; qty: number; revenue: number }[];
}

function fmtETB(n: number) {
  return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ETB";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-base font-bold text-brand-foreground flex items-center gap-2">
        <span className="h-1 w-5 rounded-full bg-brand-accent inline-block" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-brand-muted">{label}</span>
      <span className={`tabular text-sm font-semibold ${color ?? "text-brand-foreground"}`}>{value}</span>
    </div>
  );
}

export function CafeStatusContent({ d, lang }: { d: StatusData; lang: string }) {
  const growthColor = d.month.growth >= 0 ? "text-status-greenText" : "text-status-redText";
  const growthIcon = d.month.growth >= 0 ? "↑" : "↓";

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
      {/* Today's Performance */}
      <Section title={lang === "am" ? "📊 የዛሬ አፈጻጸም" : "📊 Today's Performance"}>
        <div className="grid gap-2 grid-cols-2">
          <KPICard label={lang === "am" ? "ገቢ" : "Revenue"} value={fmtETB(d.today.revenue)} icon={<CoinsIcon className="h-4 w-4" />} tone="green" />
          <KPICard label={lang === "am" ? "ትርፍ" : "Profit"} value={fmtETB(d.today.profit)} icon={<TrendUpIcon className="h-4 w-4" />} tone={d.today.profit >= 0 ? "green" : "red"} />
        </div>
        <Card className="divide-y divide-brand-border/30">
          <StatRow label={lang === "am" ? "ጠቅላላ ወጪ" : "Cost of Goods"} value={fmtETB(d.today.cost)} color="text-status-yellowText" />
          <StatRow label={lang === "am" ? "ትርፍ %" : "Profit Margin"} value={`${d.today.margin}%`} color={d.today.margin >= 30 ? "text-status-greenText" : "text-status-yellowText"} />
          <StatRow label={lang === "am" ? "ጠቅላላ ትዕዛዞች" : "Total Orders"} value={String(d.today.orders)} />
          <StatRow label={lang === "am" ? "የተጠናቀቁ" : "Completed"} value={String(d.today.completed)} color="text-status-greenText" />
          <StatRow label={lang === "am" ? "በመጠበቅ" : "Pending"} value={String(d.today.pending)} color={d.today.pending > 0 ? "text-status-yellowText" : "text-brand-muted"} />
        </Card>
      </Section>

      {/* Monthly Performance */}
      <Section title={lang === "am" ? "📅 የወሩ አፈጻጸም" : "📅 This Month"}>
        <Card className="divide-y divide-brand-border/30">
          <StatRow label={lang === "am" ? "ገቢ" : "Revenue"} value={fmtETB(d.month.revenue)} color="text-status-greenText" />
          <StatRow label={lang === "am" ? "ወጪ" : "Cost of Goods"} value={fmtETB(d.month.cost)} color="text-status-yellowText" />
          <StatRow label={lang === "am" ? "ትርፍ" : "Net Profit"} value={fmtETB(d.month.profit)} color={d.month.profit >= 0 ? "text-status-greenText" : "text-status-redText"} />
          <StatRow label={lang === "am" ? "ትርፍ %" : "Margin"} value={`${d.month.margin}%`} />
          <StatRow label={lang === "am" ? "ትዕዛዞች" : "Orders"} value={String(d.month.orders)} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-brand-muted">{lang === "am" ? "ያለፈው ወር" : "vs Last Month"}</span>
            <span className={`tabular text-sm font-bold ${growthColor}`}>
              {growthIcon} {Math.abs(d.month.growth)}%
            </span>
          </div>
        </Card>
      </Section>

      {/* Payment Methods */}
      {Object.keys(d.payments).length > 0 && (
        <Section title={lang === "am" ? "💳 የክፍያ ዘዴዎች" : "💳 Payment Methods"}>
          <Card className="divide-y divide-brand-border/30">
            {Object.entries(d.payments).map(([method, total]) => (
              <StatRow key={method} label={method.replace("_", " ")} value={fmtETB(total)} />
            ))}
          </Card>
        </Section>
      )}

      {/* Purchase & Credits */}
      <Section title={lang === "am" ? "🛒 ግዢ እና ብድር" : "🛒 Purchases & Credits"}>
        <Card className="divide-y divide-brand-border/30">
          <StatRow label={lang === "am" ? "ጠቅላላ ግዢ" : "Total Purchases"} value={fmtETB(d.purchases.total)} />
          <StatRow label={lang === "am" ? "የተከፈለ" : "Paid"} value={fmtETB(d.purchases.paid)} color="text-status-greenText" />
          <StatRow label={lang === "am" ? "ያልተከፈለ ብድር" : "Outstanding Credit"} value={fmtETB(d.purchases.credit)} color={d.purchases.credit > 0 ? "text-status-redText" : "text-status-greenText"} />
          <StatRow label={lang === "am" ? "በብድር ያሉ ትዕዛዞች" : "Credit Orders"} value={String(d.purchases.creditOrders)} color={d.purchases.creditOrders > 0 ? "text-status-redText" : "text-brand-muted"} />
          <StatRow label={lang === "am" ? "ጠቅላላ የግዢ ትዕዛዞች" : "Total POs"} value={String(d.purchases.orderCount)} />
        </Card>
      </Section>

      {/* Staff */}
      <Section title={lang === "am" ? "👥 ሰራተኞች" : "👥 Staff"}>
        <div className="grid gap-2 grid-cols-2">
          <Card className="text-center space-y-1 py-3">
            <p className="text-2xl font-bold text-brand-foreground tabular">{d.staff.total}</p>
            <p className="text-xs text-brand-muted">{lang === "am" ? "ጠቅላላ" : "Total Staff"}</p>
          </Card>
          <Card className="text-center space-y-1 py-3">
            <p className="text-2xl font-bold text-status-greenText tabular">{d.staff.activeToday}</p>
            <p className="text-xs text-brand-muted">{lang === "am" ? "ዛሬ የገቡ" : "Clocked In Today"}</p>
          </Card>
        </div>
      </Section>

      {/* Inventory */}
      <Section title={lang === "am" ? "📦 ክምችት" : "📦 Inventory"}>
        <Card className="divide-y divide-brand-border/30">
          <StatRow label={lang === "am" ? "ጠቅላላ ዕቃዎች" : "Total Items"} value={String(d.inventory.total)} />
          <StatRow label={lang === "am" ? "ዝቅተኛ ክምችት" : "Low Stock Alerts"} value={String(d.inventory.lowStock)} color={d.inventory.lowStock > 0 ? "text-status-redText" : "text-status-greenText"} />
          <StatRow label={lang === "am" ? "የክምችት ዋጋ" : "Inventory Value"} value={fmtETB(d.inventory.value)} />
        </Card>
      </Section>

      {/* Equipment */}
      <Section title={lang === "am" ? "🔧 መሳሪያዎች" : "🔧 Equipment"}>
        <Card className="divide-y divide-brand-border/30">
          <StatRow label={lang === "am" ? "ጠቅላላ" : "Total Equipment"} value={String(d.equipment.total)} />
          <StatRow label={lang === "am" ? "ጥገና ያስፈልጋል" : "Needs Repair"} value={String(d.equipment.needsRepair)} color={d.equipment.needsRepair > 0 ? "text-status-redText" : "text-status-greenText"} />
        </Card>
      </Section>

      {/* Operations */}
      <Section title={lang === "am" ? "⚙️ ስራ" : "⚙️ Operations"}>
        <div className="grid gap-2 grid-cols-3">
          <Card className="text-center space-y-1 py-3">
            <p className="text-xl font-bold text-brand-foreground tabular">{d.branches}</p>
            <p className="text-[11px] text-brand-muted">{lang === "am" ? "ቅርንጫፎች" : "Branches"}</p>
          </Card>
          <Card className="text-center space-y-1 py-3">
            <p className="text-xl font-bold text-brand-foreground tabular">{d.menu.items}</p>
            <p className="text-[11px] text-brand-muted">{lang === "am" ? "ምናሌ" : "Menu Items"}</p>
          </Card>
          <Card className="text-center space-y-1 py-3">
            <p className="text-xl font-bold text-brand-foreground tabular">{d.suppliers}</p>
            <p className="text-[11px] text-brand-muted">{lang === "am" ? "አቅራቢዎች" : "Suppliers"}</p>
          </Card>
        </div>
      </Section>

      {/* Top Selling Items */}
      {d.topItems.length > 0 && (
        <Section title={lang === "am" ? "🏆 ከፍተኛ ሽያጭ (ዛሬ)" : "🏆 Top Sellers (Today)"}>
          <Card className="divide-y divide-brand-border/30">
            {d.topItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/15 text-[11px] font-bold text-brand-accentText">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-brand-foreground">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="tabular text-sm font-semibold text-brand-foreground">{fmtETB(item.revenue)}</span>
                  <span className="ml-2 text-xs text-brand-muted">×{item.qty}</span>
                </div>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </div>
  );
}

export function CafeStatusFAB() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
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
    healthScore >= 80 ? "text-status-greenText" :
    healthScore >= 50 ? "text-status-yellowText" :
    "text-status-redText";

  const healthLabel =
    healthScore >= 80 ? (lang === "am" ? "ጥሩ" : "Excellent") :
    healthScore >= 50 ? (lang === "am" ? "መካከለኛ" : "Moderate") :
    (lang === "am" ? "ትኩረት ያስፈልጋል" : "Needs Attention");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-toast flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-accent to-emerald-500 px-5 py-3.5 text-sm font-bold text-white shadow-pop transition-all hover:scale-105 hover:shadow-lg active:scale-95 animate-in"
        aria-label="Cafe Status"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {lang === "am" ? "ካፌ ሁኔታ" : "Cafe Status"}
        {data && (
          <span className={`ml-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold ${healthScore < 50 ? "animate-pulse" : ""}`}>
            {healthScore}%
          </span>
        )}
      </button>

      {open && (
        <div
          className="animate-fade fixed inset-0 z-modal flex items-start justify-center bg-black/70 p-4 pt-8 backdrop-blur-md overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-in w-full max-w-lg rounded-3xl border border-brand-border bg-brand-surface p-5 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-brand-foreground">
                  {lang === "am" ? "☕ ካፌ ሁኔታ" : "☕ Cafe Status"}
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">{lang === "am" ? "ሙሉ የካፌ ዝርዝር" : "Complete business overview"}</p>
              </div>
              <div className="flex items-center gap-3">
                {data && (
                  <div className="text-right">
                    <p className={`text-2xl font-black tabular ${healthColor}`}>{healthScore}%</p>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${healthColor}`}>{healthLabel}</p>
                  </div>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-brand-muted transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Health Bar */}
            {data && (
              <div className="mb-5">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-border">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      healthScore >= 80 ? "bg-gradient-to-r from-status-green to-emerald-400" :
                      healthScore >= 50 ? "bg-gradient-to-r from-status-yellow to-amber-400" :
                      "bg-gradient-to-r from-status-red to-rose-400"
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            {loading && !data ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : data ? (
              <CafeStatusContent d={data} lang={lang} />
            ) : (
              <EmptyState>{lang === "am" ? "ዳታ ማግኘት አልተቻለም" : "Unable to load status"}</EmptyState>
            )}
          </div>
        </div>
      )}
    </>
  );
}
