"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { usePoll } from "@/components/fetcher";
import { cn } from "@/lib/utils";

function formatEthiopianTimeShort(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  let ethHours = (hours - 6) % 12;
  if (ethHours === 0) ethHours = 12;
  if (ethHours < 0) ethHours += 12;
  return `${ethHours}:${minutes}`;
}

function getElapsedText(inTime: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(inTime).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, "0")} hours`;
}

function getCompletedElapsedText(inTime: string, outTime: string): string {
  const mins = Math.max(0, Math.floor((new Date(outTime).getTime() - new Date(inTime).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, "0")} hours`;
}

/**
 * HeaderClock component displays the live Ethiopian local time with seconds
 * (6-hour offset) as the primary display, and dynamically shows the
 * Clock In status or standard time underneath.
 *
 * Supports a `compact` prop for mobile responsive rendering inside drawers.
 */
export function HeaderClock({
  compact = false,
  showStatus = true,
}: {
  compact?: boolean;
  showStatus?: boolean;
}) {
  const [time, setTime] = useState<Date | null>(null);
  const { lang } = useLang();
  
  // Fetch clock status (both open and completed today)
  const { data } = usePoll<{ 
    open: { id: string; clockIn: string } | null;
    completed: { id: string; clockIn: string; clockOut: string } | null;
  }>(showStatus ? "/api/attendance/clock" : null, 30000);
  const open = data?.open ?? null;
  const completed = data?.completed ?? null;

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return null;

  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  // Ethiopian Time Calculation (6-hour offset)
  let ethHours = (hours - 6) % 12;
  if (ethHours === 0) ethHours = 12;
  if (ethHours < 0) ethHours += 12;
  
  // Format live Ethiopian time: e.g. 8:05:09
  const ethClockStr = `${ethHours}:${minutes}:${seconds}`;

  // Standard Time formatting for fallback
  const standardHours = hours % 12 || 12;
  const standardPeriod = hours >= 12 ? "PM" : "AM";
  const standardStr = `${standardHours}:${minutes}:${seconds} ${standardPeriod}`;

  // Determine status text
  let statusText = standardStr;
  if (open) {
    const inStr = formatEthiopianTimeShort(new Date(open.clockIn));
    const liveDiff = getElapsedText(open.clockIn);
    statusText = lang === "am"
      ? `(${inStr} ገብቷል - ቀጥታ (${liveDiff}))`
      : `(${inStr} in - Live (${liveDiff}))`;
  } else if (completed) {
    const inStr = formatEthiopianTimeShort(new Date(completed.clockIn));
    const outStr = formatEthiopianTimeShort(new Date(completed.clockOut));
    const finalDiff = getCompletedElapsedText(completed.clockIn, completed.clockOut);
    statusText = lang === "am"
      ? `(${inStr} ገብቷል-${outStr} ወጥቷል (${finalDiff}))`
      : `(${inStr} in-${outStr} out (${finalDiff}))`;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none h-[48px] transition-all",
        compact
          ? "w-full bg-brand-surface2 text-brand-foreground border border-brand-border/60 rounded-xl px-4 py-1.5 shadow-sm"
          : "text-white mr-1 bg-white/10 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner min-w-[150px]"
      )}
    >
      {/* Large bold Ethiopian Time with seconds */}
      <div className="text-base font-bold tabular-nums tracking-wide leading-none select-all">
        {ethClockStr}
      </div>
      {/* Clock-in status badge or standard time */}
      {showStatus && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-bold tracking-wide mt-1.5 leading-none",
            compact ? "text-brand-muted" : "text-white/70"
          )}
        >
          {open && <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" />}
          {!open && completed && <span className="h-2 w-2 rounded-full bg-brand-muted" />}
          <span>{statusText}</span>
        </div>
      )}
    </div>
  );
}
