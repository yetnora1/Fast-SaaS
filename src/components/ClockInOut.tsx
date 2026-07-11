"use client";
import { useEffect, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { ClockIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function formatEthiopianTimeShort(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  let ethHours = (hours - 6) % 12;
  if (ethHours === 0) ethHours = 12;
  if (ethHours < 0) ethHours += 12;
  return `${ethHours}:${minutes}`;
}

export function ClockInOut({ compact = false }: { compact?: boolean }) {
  const { lang, t } = useLang();
  const { data, reload } = usePoll<{ 
    open: { id: string; clockIn: string } | null;
    completed: { id: string; clockIn: string; clockOut: string } | null;
  }>("/api/attendance/clock", 30000);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;

  const open = data.open ?? null;
  const completed = data.completed ?? null;

  async function toggle() {
    setBusy(true);
    try {
      await api("/api/attendance/clock", { method: "POST" });
      reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  function getWorkedHoursText(inTime: string, outTime: string): string {
    const mins = Math.max(0, Math.floor((new Date(outTime).getTime() - new Date(inTime).getTime()) / 60_000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, "0")} hours`;
  }

  function getSessionString(inTime: string, outTime: string): string {
    const inStr = formatEthiopianTimeShort(new Date(inTime));
    const outStr = formatEthiopianTimeShort(new Date(outTime));
    const diff = getWorkedHoursText(inTime, outTime);
    return `(${inStr} in-${outStr} out (${diff}))`;
  }

  function elapsed(): string {
    if (!open) return "";
    const mins = Math.max(0, Math.floor((Date.now() - new Date(open.clockIn).getTime()) / 60_000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  const alreadyDone = !open && !!completed;

  return (
    <button
      onClick={toggle}
      disabled={busy || alreadyDone}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        compact
          ? "w-full justify-center py-3 bg-status-green/15 text-status-greenText hover:bg-status-green/25"
          : open
            ? "bg-status-redSolid text-white hover:bg-red-700 shadow-sm"
            : "bg-status-greenSolid text-white hover:bg-green-800 shadow-sm",
        compact && open && "bg-status-red/15 text-status-redText hover:bg-status-red/25"
      )}
      title={open ? t("clockOut") : t("clockIn")}
    >
      <ClockIcon className="h-4 w-4" />
      {open ? (
        <>
          {t("clockOut")}
          <span className="tabular rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold">{elapsed()}</span>
        </>
      ) : (
        t("clockIn")
      )}
    </button>
  );
}
