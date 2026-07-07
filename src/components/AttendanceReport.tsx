"use client";
import { useMemo, useState } from "react";
import { usePoll } from "@/components/fetcher";
import { Card, KPICard, PageHeader, EmptyState, Input, Select, Spinner, RoleBadge } from "@/components/ui";
import { ClockIcon, UsersIcon, ChartIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import type { Role } from "@prisma/client";

interface Row {
  id: string;
  userId: string;
  name: string;
  role: Role;
  branch: string | null;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  open: boolean;
}
interface Report {
  rows: Row[];
  summary: { userId: string; name: string; role: Role; daysPresent: number; totalHours: number }[];
  totals: { records: number; staff: number; hours: number; openNow: number };
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
type Preset = "day" | "week" | "month" | "6month" | "year";

/** Manager/owner attendance dashboard: permanent records filtered by period. */
export function AttendanceReport() {
  const { t, statusLabel } = useLang();
  const today = new Date();

  const [preset, setPreset] = useState<Preset>("week");
  const [from, setFrom] = useState(() => fmtDate(mondayOf(today)));
  const [to, setTo] = useState(fmtDate(today));
  const [staffId, setStaffId] = useState("");

  function applyPreset(p: Preset) {
    const end = new Date();
    let start = new Date();
    if (p === "day") start = end;
    else if (p === "week") start = mondayOf(end);
    else if (p === "month") start = new Date(end.getFullYear(), end.getMonth(), 1);
    else if (p === "6month") { start = new Date(end); start.setMonth(end.getMonth() - 6); }
    else start = new Date(end.getFullYear(), 0, 1);
    setPreset(p);
    setFrom(fmtDate(start));
    setTo(fmtDate(end));
  }

  const query = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (staffId) p.set("userId", staffId);
    return p.toString();
  }, [from, to, staffId]);

  const { data, loading } = usePoll<Report>(`/api/attendance/report?${query}`, 0);
  const rows = data?.rows ?? [];

  // Staff filter options come from the loaded summary (no extra endpoint).
  const staffOptions = data?.summary ?? [];

  const presets: { key: Preset; label: string }[] = [
    { key: "day", label: t("today") },
    { key: "week", label: t("thisWeek") },
    { key: "month", label: t("thisMonth") },
    { key: "6month", label: t("last6Months") },
    { key: "year", label: t("thisYear") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("attendanceTitle")} subtitle={t("attendanceSubtitle")} />

      {/* Period filter */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                preset === p.key
                  ? "bg-brand-accent text-brand-accentFg"
                  : "bg-brand-surface2 text-brand-muted hover:bg-white/10 hover:text-brand-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
          {loading && <Spinner className="ml-1" />}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("dateFrom")}
            <Input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPreset("day"); }} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("dateTo")}
            <Input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPreset("day"); }} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-brand-muted">
            {t("staffWord")}
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">{t("allStaff")}</option>
              {staffOptions.map((s) => (
                <option key={s.userId} value={s.userId}>{s.name}</option>
              ))}
            </Select>
          </label>
        </div>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard label={t("staffPresent")} value={String(data?.totals.staff ?? 0)} tone="blue" icon={<UsersIcon className="h-5 w-5" />} />
        <KPICard label={t("onDutyNow")} value={String(data?.totals.openNow ?? 0)} tone="green" icon={<ClockIcon className="h-5 w-5" />} />
        <KPICard label={t("totalHours")} value={`${data?.totals.hours ?? 0} h`} tone="accent" icon={<ChartIcon className="h-5 w-5" />} />
        <KPICard label={t("attendanceRecords")} value={String(data?.totals.records ?? 0)} tone="yellow" icon={<ClockIcon className="h-5 w-5" />} />
      </div>

      {/* Per-staff summary */}
      <Card>
        <div className="mb-3 font-medium">{t("staffSummary")}</div>
        {staffOptions.length === 0 ? (
          <EmptyState icon={<UsersIcon className="h-7 w-7" />}>{t("noAttendance")}</EmptyState>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {staffOptions.map((s) => (
              <button
                key={s.userId}
                onClick={() => setStaffId(staffId === s.userId ? "" : s.userId)}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors ${
                  staffId === s.userId ? "border-brand-accent bg-brand-accent/10" : "border-brand-border bg-brand-surface2 hover:bg-white/5"
                }`}
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="mt-0.5"><RoleBadge role={s.role} /></div>
                </div>
                <div className="text-right">
                  <div className="tabular text-lg font-bold text-brand-accent">{s.totalHours} h</div>
                  <div className="text-xs text-brand-muted">{s.daysPresent} {t("daysWord")}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Detailed records */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-medium">{t("attendanceRecords")}</div>
          <div className="text-xs text-brand-muted">{t("showing")} {rows.length}</div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<ClockIcon className="h-7 w-7" />}>{t("noAttendance")}</EmptyState>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-2 py-2 font-medium">{t("date")}</th>
                  <th className="px-2 py-2 font-medium">{t("staffWord")}</th>
                  <th className="px-2 py-2 font-medium">{t("role")}</th>
                  <th className="px-2 py-2 font-medium">{t("clockInCol")}</th>
                  <th className="px-2 py-2 font-medium">{t("clockOutCol")}</th>
                  <th className="px-2 py-2 text-right font-medium">{t("hoursCol")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-brand-border/50 hover:bg-white/5">
                    <td className="whitespace-nowrap px-2 py-2 text-brand-muted">{new Date(r.clockIn).toLocaleDateString()}</td>
                    <td className="px-2 py-2 font-medium">{r.name}</td>
                    <td className="px-2 py-2"><RoleBadge role={r.role} /></td>
                    <td className="tabular whitespace-nowrap px-2 py-2">{new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="tabular whitespace-nowrap px-2 py-2">
                      {r.clockOut ? (
                        new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-green/15 px-2 py-0.5 text-xs font-medium text-status-green">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                          {t("onDutyChip")}
                        </span>
                      )}
                    </td>
                    <td className="tabular px-2 py-2 text-right font-semibold">{r.hours} h</td>
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

function mondayOf(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  return x;
}
