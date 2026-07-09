"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, RoleBadge, PageHeader, Field, Spinner, KPICard } from "@/components/ui";
import type { Role } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────
interface PayrollRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  branchName: string;
  month: number;
  year: number;
  grossSalary: number;
  totalDays: number;
  workedDays: number;
  absentDays: number;
  earnedSalary: number;
  pension: number;
  taxableIncome: number;
  incomeTax: number;
  netSalary: number;
  status: string;
}

interface SalaryConfig {
  userId: string;
  userName: string;
  userRole: Role;
  grossSalary: number;
  effectiveFrom: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatETB(n: number) {
  return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-brand-surface2 text-brand-muted",
    PROCESSED: "bg-status-yellow/15 text-status-yellow",
    APPROVED: "bg-status-green/15 text-status-green",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${styles[status] || styles.DRAFT}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function OwnerPayrollPage() {
  const [tab, setTab] = useState<"overview" | "config">("overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Overview"
        subtitle="View payroll records and approve processed batches"
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-brand-surface2 p-1">
        {([
          ["overview", "📊 Payroll Overview"],
          ["config", "💼 Salary Config"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              tab === key
                ? "bg-brand-accent text-brand-accentFg shadow-card"
                : "text-brand-muted hover:text-brand-foreground hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "config" && <ConfigTab />}
    </div>
  );
}

// ── Tab 1: Payroll Overview ──────────────────────────────────────
function OverviewTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [approving, setApproving] = useState(false);
  const [approveMsg, setApproveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { data, loading, reload } = usePoll<{ records: PayrollRecord[]; salaryConfigs: SalaryConfig[] }>(
    `/api/owner/payroll?month=${month}&year=${year}`,
    0
  );

  const records = data?.records ?? [];
  const processedCount = records.filter((r) => r.status === "PROCESSED").length;
  const approvedCount = records.filter((r) => r.status === "APPROVED").length;

  const totals = records.reduce(
    (acc, r) => ({
      gross: acc.gross + r.grossSalary,
      earned: acc.earned + r.earnedSalary,
      pension: acc.pension + r.pension,
      tax: acc.tax + r.incomeTax,
      net: acc.net + r.netSalary,
    }),
    { gross: 0, earned: 0, pension: 0, tax: 0, net: 0 }
  );

  async function approveAll() {
    setApproving(true);
    setApproveMsg(null);
    try {
      const res = await api<{ approved: number }>("/api/owner/payroll/approve", {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
      setApproveMsg({ text: `${res.approved} payroll record(s) approved!`, ok: true });
      reload();
    } catch (e) {
      setApproveMsg({ text: (e as Error).message, ok: false });
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Month/Year selector */}
      <Card className="flex flex-wrap gap-3 items-end">
        <Field label="Month">
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Year">
          <Input
            type="number"
            min="2020"
            max="2030"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-28"
          />
        </Field>
        <Button variant="ghost" onClick={reload} className="self-end">
          🔄 Refresh
        </Button>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : records.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center text-brand-muted">
          <svg className="h-12 w-12 opacity-40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No payroll records for {MONTHS[month - 1]} {year}.</p>
          <p className="text-xs mt-1">The manager needs to process payroll first.</p>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <KPICard label="Total Employees" value={String(records.length)} tone="accent" />
            <KPICard label="Total Gross" value={`${formatETB(totals.gross)} ETB`} tone="blue" />
            <KPICard label="Total Net Pay" value={`${formatETB(totals.net)} ETB`} tone="green" />
            <KPICard label="Total Tax" value={`${formatETB(totals.tax)} ETB`} tone="red" />
            <KPICard label="Total Pension" value={`${formatETB(totals.pension)} ETB`} tone="yellow" />
          </div>

          {/* Approve button */}
          {processedCount > 0 && (
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-foreground">
                  {processedCount} record(s) pending approval
                </p>
                <p className="text-xs text-brand-muted">
                  {approvedCount} already approved this month
                </p>
              </div>
              <Button onClick={approveAll} loading={approving}>
                ✅ Approve All ({processedCount})
              </Button>
            </Card>
          )}

          {approveMsg && (
            <div className={`rounded-xl border p-3 text-sm ${
              approveMsg.ok
                ? "border-status-green/30 bg-status-green/10 text-status-green"
                : "border-status-red/30 bg-status-red/10 text-status-red"
            }`}>
              {approveMsg.text}
            </div>
          )}

          {/* Full table */}
          <Card>
            <h3 className="font-display font-bold text-brand-foreground mb-3">
              {MONTHS[month - 1]} {year} — Payroll Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                    <th className="pb-3 pr-3 font-medium">Employee</th>
                    <th className="pb-3 pr-3 font-medium">Role</th>
                    <th className="pb-3 pr-3 font-medium text-right">Gross</th>
                    <th className="pb-3 pr-3 font-medium text-right">Days</th>
                    <th className="pb-3 pr-3 font-medium text-right">Absent</th>
                    <th className="pb-3 pr-3 font-medium text-right">Earned</th>
                    <th className="pb-3 pr-3 font-medium text-right">Pension</th>
                    <th className="pb-3 pr-3 font-medium text-right">Tax</th>
                    <th className="pb-3 pr-3 font-medium text-right">Net Pay</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-3">
                        <span className="font-medium text-brand-foreground">{r.userName}</span>
                        <p className="text-xs text-brand-muted">{r.branchName}</p>
                      </td>
                      <td className="py-3 pr-3"><RoleBadge role={r.userRole} /></td>
                      <td className="py-3 pr-3 text-right tabular text-brand-foreground">{formatETB(r.grossSalary)}</td>
                      <td className="py-3 pr-3 text-right tabular text-status-green">{r.workedDays}/{r.totalDays}</td>
                      <td className="py-3 pr-3 text-right tabular text-status-red">{r.absentDays}</td>
                      <td className="py-3 pr-3 text-right tabular text-brand-foreground">{formatETB(r.earnedSalary)}</td>
                      <td className="py-3 pr-3 text-right tabular text-brand-muted">-{formatETB(r.pension)}</td>
                      <td className="py-3 pr-3 text-right tabular text-brand-muted">-{formatETB(r.incomeTax)}</td>
                      <td className="py-3 pr-3 text-right tabular font-bold text-brand-accent">{formatETB(r.netSalary)}</td>
                      <td className="py-3 text-center"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-border font-semibold text-brand-foreground">
                    <td colSpan={2} className="py-3 pr-3">Total ({records.length})</td>
                    <td className="py-3 pr-3 text-right tabular">{formatETB(totals.gross)}</td>
                    <td className="py-3 pr-3" />
                    <td className="py-3 pr-3" />
                    <td className="py-3 pr-3 text-right tabular">{formatETB(totals.earned)}</td>
                    <td className="py-3 pr-3 text-right tabular text-brand-muted">-{formatETB(totals.pension)}</td>
                    <td className="py-3 pr-3 text-right tabular text-brand-muted">-{formatETB(totals.tax)}</td>
                    <td className="py-3 pr-3 text-right tabular font-bold text-brand-accent">{formatETB(totals.net)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Tab 2: Salary Config (Read-Only) ─────────────────────────────
function ConfigTab() {
  const now = new Date();
  const { data, loading } = usePoll<{ records: PayrollRecord[]; salaryConfigs: SalaryConfig[] }>(
    `/api/owner/payroll?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    0
  );

  const configs = data?.salaryConfigs ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-display font-bold text-brand-foreground mb-1">Current Salary Configurations</h3>
        <p className="text-xs text-brand-muted mb-4">Set by the manager. This is a read-only view.</p>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : configs.length === 0 ? (
          <div className="py-8 text-center text-sm text-brand-muted">
            No salary configurations found. The manager needs to set salaries first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium text-right">Monthly Gross (ETB)</th>
                  <th className="pb-3 font-medium text-right">Effective Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {configs.map((c) => (
                  <tr key={c.userId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-4 font-medium text-brand-foreground">{c.userName}</td>
                    <td className="py-3.5 pr-4"><RoleBadge role={c.userRole} /></td>
                    <td className="py-3.5 pr-4 text-right tabular font-semibold text-brand-foreground">{formatETB(c.grossSalary)}</td>
                    <td className="py-3.5 text-right text-brand-muted">
                      {new Date(c.effectiveFrom).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
