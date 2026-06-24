"use client";
import { useMemo, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Staff { id: string; name: string; role: string }
interface Schedule { id: string; date: string; shiftStart: string; shiftEnd: string; status: string; user: Staff }
interface Data { schedules: Schedule[]; staff: Staff[]; from: string; to: string; branchId: string }

const SHIFT_TYPES = [
  { key: "morning", start: "06:00", end: "14:00" },
  { key: "afternoon", start: "14:00", end: "22:00" },
  { key: "fullDay", start: "06:00", end: "22:00" },
] as const;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function SchedulePage() {
  const { t } = useLang();
  const { data, reload } = usePoll<Data>("/api/manager/schedule", 0);
  const [form, setForm] = useState({ userId: "", date: ymd(new Date()), shiftStart: "06:00", shiftEnd: "14:00" });
  const [msg, setMsg] = useState<string | null>(null);

  const days = useMemo(() => {
    if (!data) return [] as Date[];
    const start = new Date(data.from);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, [data]);

  async function addShift() {
    setMsg(null);
    if (!data) return;
    if (!form.userId) { setMsg("Select a staff member"); return; }
    try {
      await api("/api/manager/schedule", { method: "POST", body: JSON.stringify({ ...form, branchId: data.branchId }) });
      reload();
    } catch (e) { setMsg((e as Error).message); }
  }
  async function remove(id: string) {
    await api(`/api/manager/schedule/${id}`, { method: "DELETE" });
    reload();
  }
  async function publish() {
    setMsg(null);
    if (!data) return;
    try {
      const r = await api<{ published: number; notified: number }>("/api/manager/schedule/publish", { method: "POST", body: JSON.stringify({ branchId: data.branchId }) });
      setMsg(`Published ${r.published} shift(s); notified ${r.notified} staff.`);
      reload();
    } catch (e) { setMsg((e as Error).message); }
  }

  const byDay = (d: Date) => (data?.schedules ?? []).filter((s) => s.date.slice(0, 10) === ymd(d));

  return (
    <div className="space-y-5">
      <PageHeader title={t("weeklySchedule")}>
        <Button onClick={publish}>{t("publishScheduleBtn")}</Button>
      </PageHeader>

      <Card className="space-y-2">
        <div className="font-medium">{t("addShift")}</div>
        <div className="grid gap-2 md:grid-cols-5">
          <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
            <option value="">{t("selectStaff")}</option>
            {data?.staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </Select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input type="time" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} />
          <Input type="time" value={form.shiftEnd} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} />
          <Button onClick={addShift}>{t("add")}</Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {SHIFT_TYPES.map((st) => (
            <button
              key={st.key}
              className="rounded-lg bg-brand-surface2 px-2.5 py-1.5 font-medium transition-colors hover:bg-white/10"
              onClick={() => setForm({ ...form, shiftStart: st.start, shiftEnd: st.end })}
            >
              {t(st.key)} <span className="tabular text-brand-muted">({st.start}-{st.end})</span>
            </button>
          ))}
        </div>
        {msg && <p className="text-sm text-brand-accent">{msg}</p>}
      </Card>

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => (
          <Card key={ymd(d)} className="min-h-[8rem] space-y-2">
            <div className="text-sm font-medium">{d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", timeZone: "UTC" })}</div>
            {byDay(d).map((s) => (
              <div key={s.id} className="rounded-lg border border-brand-border bg-brand-surface2 p-2 text-xs">
                <div className="font-medium">{s.user.name}</div>
                <div className="tabular text-brand-muted">{s.shiftStart}-{s.shiftEnd}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-brand-muted">{s.status}</span>
                  <button className="text-status-red hover:opacity-80" onClick={() => remove(s.id)} title="Remove">✕</button>
                </div>
              </div>
            ))}
            {byDay(d).length === 0 && <div className="text-xs text-brand-muted/50">—</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}