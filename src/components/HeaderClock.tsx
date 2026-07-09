"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

/**
 * HeaderClock component displays the standard local time
 * alongside the Ethiopian local time count (6-hour offset).
 */
export function HeaderClock() {
  const [time, setTime] = useState<Date | null>(null);
  const { lang } = useLang();

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

  // Ethiopian Time calculation
  let ethHours = (hours - 6) % 12;
  if (ethHours === 0) ethHours = 12;
  if (ethHours < 0) ethHours += 12;

  // Determine period in Ethiopian system (Daytime vs Nighttime)
  const isEthDay = hours >= 6 && hours < 18;
  
  // Amharic vs English labeling
  let ethPeriod = "";
  if (lang === "am") {
    ethPeriod = isEthDay ? "ቀን" : "ሌሊት";
  } else {
    ethPeriod = isEthDay ? "ቀን" : "ሌሊት"; // Commonly referred to as ቀን / ሌሊት even in English-based Ethiopian clocks
  }

  // Standard Time formatting
  const standardHours = hours % 12 || 12;
  const standardPeriod = hours >= 12 ? "PM" : "AM";
  const standardStr = `${standardHours}:${minutes} ${standardPeriod}`;
  const ethStr = `🇪🇹 ${ethHours}:${minutes} ${ethPeriod}`;

  return (
    <div className="flex flex-col items-center justify-center text-xs text-white/95 mr-1 bg-white/10 px-3 py-1 rounded-xl select-none min-w-[105px] h-10 border border-white/5 shadow-inner">
      <div className="font-bold tabular-nums tracking-wide leading-none">{standardStr}</div>
      <div className="text-[10px] text-white/70 font-bold tabular-nums tracking-wide mt-1 leading-none">{ethStr}</div>
    </div>
  );
}
