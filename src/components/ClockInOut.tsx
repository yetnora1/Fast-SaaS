"use client";
import { useEffect, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { ClockIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Header clock in/out control — staff tap it when they start and finish work.
 * Every tap writes a permanent StaffAttendance row. Rendered for all roles
 * except the café owner (gated by the caller).
 */
export function ClockInOut({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const { data, reload } = usePoll<{ open: { id: string; clockIn: string } | null }>("/api/attendance/clock", 30000);
  const [busy, setBusy] = useState(false);
  // Re-render each minute so the elapsed badge stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const open = data?.open ?? null;

  async function toggle() {
    setBusy(true);
    try {
      await api("/api/attendance/clock", { method: "POST" });
      reload();
    } catch {
      // Status poll will resync; keep the header quiet on transient errors.
    } finally {
      setBusy(false);
    }
  }

  function elapsed(): string {
    if (!open) return "";
    const mins = Math.max(0, Math.floor((Date.now() - new Date(open.clockIn).getTime()) / 60_000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (!data) return null; // avoid flashing the wrong state before first load

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-60",
        compact && "w-full justify-center py-3",
        open
          ? "bg-status-red/15 text-status-red hover:bg-status-red/25"
          : "bg-status-green/15 text-status-green hover:bg-status-green/25",
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
