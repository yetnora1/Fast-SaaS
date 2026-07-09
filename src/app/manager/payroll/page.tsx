"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, RoleBadge, PageHeader, Field, Spinner, Modal } from "@/components/ui";
import type { Role } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────
interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: { id: string; name: string } | null;
  currentSalary: { id: string; grossSalary: number; effectiveFrom: string } | null;
}

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatETB(n: number) {
  return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Status badge ──────────────────────────────────────────────────
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
export default function ManagerPayrollPage() {
  const [tab, setTab] = useState<"salary" | "process" | "records">("salary");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        subtitle="Set salaries, process monthly payroll, and review records"
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-brand-surface2 p-1">
        {([
          ["salary", "💰 Salary Setup"],
          ["process", "⚙️ Process Payroll"],
          ["records", "📋 Records"],
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

      {tab === "salary" && <SalaryTab />}
      {tab === "process" && <ProcessTab />}
      {tab === "records" && <RecordsTab />}
    </div>
  );
}

// ── Tab 1: Salary Setup ───────────────────────────────────────────
function SalaryTab() {
  const { data, reload, loading } = usePoll<{ employees: Employee[] }>("/api/manager/payroll/salary", 0);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSalary, setEditSalary] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function saveSalary(userId: string) {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/manager/payroll/salary", {
        method: "POST",
        body: JSON.stringify({ userId, grossSalary: parseFloat(editSalary) }),
      });
      setMsg({ text: "Salary updated successfully!", ok: true });
      setEditId(null);
      setEditSalary("");
      reload();
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-xl border p-3 text-sm ${
          msg.ok
            ? "border-status-green/30 bg-status-green/10 text-status-green"
            : "border-status-red/30 bg-status-red/10 text-status-red"
        }`}>
          {msg.text}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="pb-3 pr-4 font-medium">Employee</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Branch</th>
                <th className="pb-3 pr-4 font-medium text-right">Monthly Salary (ETB)</th>
                <th className="pb-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30">
              {data?.employees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pr-4">
                    <div>
                      <span className="font-medium text-brand-foreground">{emp.name}</span>
                      <p className="text-xs text-brand-muted">{emp.email}</p>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <RoleBadge role={emp.role} />
                  </td>
                  <td className="py-3.5 pr-4 text-brand-muted">
                    {emp.branch?.name ?? <span className="italic">Unassigned</span>}
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    {editId === emp.id ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editSalary}
                        onChange={(e) => setEditSalary(e.target.value)}
                        className="w-36 text-right ml-auto"
                        autoFocus
                      />
                    ) : (
                      <span className={`tabular font-semibold ${emp.currentSalary ? "text-brand-foreground" : "text-brand-muted italic"}`}>
                        {emp.currentSalary ? formatETB(emp.currentSalary.grossSalary) : "Not set"}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-center">
                    {editId === emp.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveSalary(emp.id)}
                          loading={saving}
                          disabled={!editSalary || parseFloat(editSalary) < 0}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditId(null); setEditSalary(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditId(emp.id);
                          setEditSalary(emp.currentSalary?.grossSalary?.toString() || "");
                        }}
                      >
                        {emp.currentSalary ? "Edit" : "Set Salary"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.employees || data.employees.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-brand-muted">
                    No employees found. Add staff members first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 2: Process Payroll ────────────────────────────────────────
function ProcessTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function processPayroll() {
    setProcessing(true);
    setError(null);
    setResults(null);
    try {
      const res = await api<{ results: any[] }>("/api/manager/payroll/process", {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
      setResults(res.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-foreground">Process Monthly Payroll</h2>
        <p className="text-sm text-brand-muted">
          Select a month and year to calculate payroll for all employees based on their attendance records and salary configuration.
        </p>

        <div className="flex flex-wrap gap-3 items-end">
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
          <Button onClick={processPayroll} loading={processing} className="self-end">
            ⚙️ Process Payroll
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-status-red/30 bg-status-red/10 p-3 text-sm text-status-red">
          {error}
        </div>
      )}

      {results && (
        <Card>
          <h3 className="font-display font-bold text-brand-foreground mb-3">
            Processing Results — {MONTHS[month - 1]} {year}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                  <th className="pb-3 pr-3 font-medium">Employee</th>
                  <th className="pb-3 pr-3 font-medium">Status</th>
                  <th className="pb-3 pr-3 font-medium text-right">Gross</th>
                  <th className="pb-3 pr-3 font-medium text-right">Worked</th>
                  <th className="pb-3 pr-3 font-medium text-right">Absent</th>
                  <th className="pb-3 pr-3 font-medium text-right">Earned</th>
                  <th className="pb-3 pr-3 font-medium text-right">Pension</th>
                  <th className="pb-3 pr-3 font-medium text-right">Tax</th>
                  <th className="pb-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {results.map((r) => (
                  <tr key={r.userId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-3">
                      <span className="font-medium text-brand-foreground">{r.name}</span>
                      <p className="text-xs text-brand-muted">{r.role.replace("_", " ")}</p>
                    </td>
                    <td className="py-3 pr-3">
                      {r.status === "processed" ? (
                        <span className="text-xs font-medium text-status-green">✓ Processed</span>
                      ) : r.status === "skipped" ? (
                        <span className="text-xs font-medium text-status-yellow">⚠ {r.error}</span>
                      ) : (
                        <span className="text-xs font-medium text-status-red">✕ {r.error}</span>
                      )}
                    </td>
                    {r.breakdown ? (
                      <>
                        <td className="py-3 pr-3 text-right tabular text-brand-foreground">{formatETB(r.breakdown.grossSalary)}</td>
                        <td className="py-3 pr-3 text-right tabular text-status-green">{r.breakdown.workedDays}</td>
                        <td className="py-3 pr-3 text-right tabular text-status-red">{r.breakdown.absentDays}</td>
                        <td className="py-3 pr-3 text-right tabular text-brand-foreground">{formatETB(r.breakdown.earnedSalary)}</td>
                        <td className="py-3 pr-3 text-right tabular text-brand-muted">-{formatETB(r.breakdown.pension)}</td>
                        <td className="py-3 pr-3 text-right tabular text-brand-muted">-{formatETB(r.breakdown.incomeTax)}</td>
                        <td className="py-3 text-right tabular font-bold text-brand-accent">{formatETB(r.breakdown.netSalary)}</td>
                      </>
                    ) : (
                      <td colSpan={7} className="py-3 text-center text-brand-muted">—</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab 3: Payroll Records ────────────────────────────────────────
function RecordsTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, loading, reload } = usePoll<{ records: PayrollRecord[] }>(
    `/api/manager/payroll/records?month=${month}&year=${year}`,
    0
  );

  const records = data?.records ?? [];
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

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap gap-3 items-end">
        <Field label="Month">
          <Select value={month} onChange={(e) => { setMonth(Number(e.target.value)); }}>
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
          <p className="text-xs mt-1">Process payroll from the &ldquo;Process Payroll&rdquo; tab first.</p>
        </Card>
      ) : (
        <Card>
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
                  <th className="pb-3 pr-3 font-medium text-right">Pension (7%)</th>
                  <th className="pb-3 pr-3 font-medium text-right">Income Tax</th>
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
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-brand-border font-semibold text-brand-foreground">
                  <td colSpan={2} className="py-3 pr-3">Total ({records.length} employees)</td>
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
      )}
    </div>
  );
}
