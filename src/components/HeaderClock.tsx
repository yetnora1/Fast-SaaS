"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { usePoll } from "@/components/fetcher";

/**
 * Helper to get Ethiopian time period labels based on standard hour.
 */
function getPeriodLabel(hours: number, lang: string): string {
  if (hours >= 6 && hours < 12) {
    return lang === "am" ? "ጠዋት" : "Morning";
  } else if (hours >= 12 && hours < 18) {
    return lang === "am" ? "ከሰዓት" : "Afternoon";
  } else if (hours >= 18 && hours < 23) {
    return lang === "am" ? "ማታ" : "Evening";
  } else {
    return lang === "am" ? "ሌሊት" : "Night";
  }
}

/**
 * HeaderClock component displays the live Ethiopian local time with seconds
 * (6-hour offset) as the primary display, and dynamically shows the
 * Clock In status or standard time underneath.
 */
export function HeaderClock() {
  const [time, setTime] = useState<Date | null>(null);
  const { lang } = useLang();
  
  // Fetch clock-in status to show "In at ..." dynamically
  const { data } = usePoll<{ open: { id: string; clockIn: string } | null }>("/api/attendance/clock", 30000);
  const open = data?.open ?? null;

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
  const ethPeriod = getPeriodLabel(hours, lang);
  
  // Format live Ethiopian time: e.g. 8:05:09
  const ethClockStr = `${ethHours}:${minutes}:${seconds}`;

  // Standard Time formatting for fallback
  const standardHours = hours % 12 || 12;
  const standardPeriod = hours >= 12 ? "PM" : "AM";
  const standardStr = `${standardHours}:${minutes}:${seconds} ${standardPeriod}`;

  // Format Clock-In status if user is currently clocked in
  let statusText = standardStr;
  if (open) {
    const ciDate = new Date(open.clockIn);
    const ciHours = ciDate.getHours();
    const ciMins = ciDate.getMinutes().toString().padStart(2, "0");
    
    let ciEthHours = (ciHours - 6) % 12;
    if (ciEthHours === 0) ciEthHours = 12;
    if (ciEthHours < 0) ciEthHours += 12;
    const ciPeriod = getPeriodLabel(ciHours, lang);

    statusText = lang === "am"
      ? `በ ${ciEthHours}:${ciMins} ${ciPeriod} ገብተዋል`
      : `In at ${ciEthHours}:${ciMins} ${ciPeriod}`;
  }

  return (
    <div className="flex flex-col items-center justify-center text-white mr-1 bg-white/10 px-4 py-1.5 rounded-xl select-none min-w-[140px] h-[48px] border border-white/5 shadow-inner">
      {/* Large bold Ethiopian Time with seconds */}
      <div className="text-base font-bold tabular-nums tracking-wide leading-none select-all">
        {ethClockStr}
      </div>
      {/* Clock-in status badge or standard time */}
      <div className="flex items-center gap-1.5 text-[10px] text-white/70 font-semibold tracking-wide mt-1.5 leading-none">
        {open && <span className="h-2 w-2 rounded-full bg-status-green animate-pulse" />}
        <span>{statusText}</span>
      </div>
    </div>
  );
}
