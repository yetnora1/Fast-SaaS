"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { ClockInOut } from "@/components/ClockInOut";
import { HeaderClock } from "@/components/HeaderClock";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BellIcon, GlobeIcon, LogOutIcon, SunIcon, MoonIcon } from "@/components/icons";
import { CafeStatusFAB } from "@/components/CafeStatusFAB";

// "#0d7d6c" -> "13 125 108", the triplet form Tailwind's
// rgb(var(--x-rgb) / <alpha-value>) color tokens consume.
function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)).join(" ");
}

export function AppShell({
  title,
  nav,
  banner,
  children,
}: {
  title: string;
  nav: { href: string; label: string }[];
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, toggle, t, navLabel } = useLang();
  const { data } = usePoll<{ unread: number }>("/api/notifications", 10000);
  const { data: profileData } = usePoll<{
    user: { id: string; name: string; role: string; avatarUrl: string | null };
  }>("/api/profile", 30000);
  const user = profileData?.user;
  const displayName = user?.name || navLabel(title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  // Read theme selection from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("themeMode");
    if (savedTheme === "dark" || savedTheme === "light") {
      setThemeMode(savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeMode(prefersDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
    localStorage.setItem("themeMode", nextTheme);
  };

  // Close mobile menu on pathname change
  const [activePath, setActivePath] = useState(pathname);
  if (pathname !== activePath) {
    setIsMenuOpen(false);
    setActivePath(pathname);
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  let profileHref = "/login";
  if (user?.role) {
    if (user.role === "saas_owner") {
      profileHref = "/saas-admin/profile";
    } else if (user.role === "store_manager") {
      profileHref = "/store/profile";
    } else if (user.role === "cafe_manager") {
      profileHref = "/manager/profile";
    } else if (user.role === "cafe_owner") {
      profileHref = "/owner/profile";
    } else {
      profileHref = `/${user.role}/profile`;
    }
  }

  const iconBtn =
    "inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-sm text-white transition-colors hover:bg-white/20";

  // Attendance: every cafe role clocks in/out; platform admin doesn't.
  const showClock = Boolean(user?.role && user.role !== "saas_owner");

  // Dynamically determine the module theme based on the path and mode
  const isDark = themeMode === "dark";

  let bg = isDark ? "#0b0f19" : "#FFFFFF";
  let surface = isDark ? "#161f30" : "#f8fafc";
  let surface2 = isDark ? "#222d41" : "#f1f5f9";
  let header = "#2563EB"; // Permanent bright blue header (white text 5.17:1)
  let border = isDark ? "#2a384e" : "#cbd5e1";
  let muted = isDark ? "#ACBCBF" : "#64748b";
  let foreground = isDark ? "#FFFFFF" : "#0f172a";
  let accent = "#0d7d6c";
  let accentHover = "#0a6558";
  // Accent-as-text needs a brighter hue on dark surfaces (the button accents
  // above are tuned for white-on-accent and drop to ~3:1 as dark-mode text).
  let accentTextDark = "#05AD98";

  if (pathname.includes("/dashboard")) {
    // Sapphire nightfall whisper
    bg = isDark ? "#070a13" : "#FFFFFF";
    surface = isDark ? "#0e1524" : "#f0f4f8";
    surface2 = isDark ? "#182235" : "#e1e9f0";
    border = isDark ? "#1a263c" : "#d0dfee";
    muted = isDark ? "#7d9cc9" : "#475569";
    foreground = isDark ? "#FFFFFF" : "#0f172a";
    accent = "#0474c4";
    accentHover = "#035fa3";
    accentTextDark = "#4A9FE8";
  } else if (pathname.includes("/menu")) {
    // Vichy
    bg = isDark ? "#0d1117" : "#FFFFFF";
    surface = isDark ? "#161b22" : "#f2f9f8";
    surface2 = isDark ? "#21262d" : "#e3efef";
    border = isDark ? "#30363d" : "#c7e2df";
    muted = isDark ? "#878787" : "#4b5563";
    foreground = isDark ? "#FFFFFF" : "#0d1117";
    accent = "#0d7d6c";
    accentHover = "#0a6558";
    accentTextDark = "#05AD98";
  } else if (pathname.includes("/staff") || pathname.includes("/attendance")) {
    // Arctic reflection
    bg = isDark ? "#0b131a" : "#FFFFFF";
    surface = isDark ? "#121e29" : "#f1f5f9";
    surface2 = isDark ? "#1d2f3f" : "#e2e8f0";
    border = isDark ? "#243c4c" : "#cbd5e1";
    muted = isDark ? "#acbcbf" : "#64748b";
    foreground = isDark ? "#FFFFFF" : "#0f172a";
    accent = "#3f6f92";
    accentHover = "#33597a";
    accentTextDark = "#6FA0C0";
  } else if (pathname.includes("/payments") || pathname.includes("/reports") || pathname.includes("/branches")) {
    // Neptune
    bg = isDark ? "#0c1017" : "#FFFFFF";
    surface = isDark ? "#141a24" : "#edf7fd";
    surface2 = isDark ? "#1f2937" : "#d8eefb";
    border = isDark ? "#2e3d52" : "#b5dffa";
    muted = isDark ? "#6d8bc0" : "#334155";
    foreground = isDark ? "#FFFFFF" : "#0c1017";
    accent = "#267676";
    accentHover = "#1f6060";
    accentTextDark = "#4ab5b5";
  } else if (pathname.includes("/payroll")) {
    // Green (Emerald)
    bg = isDark ? "#060b07" : "#FFFFFF";
    surface = isDark ? "#0c140e" : "#f0fdf4";
    surface2 = isDark ? "#142217" : "#dcfce7";
    border = isDark ? "#1b2e20" : "#bbf7d0";
    muted = isDark ? "#86a38b" : "#166534";
    foreground = isDark ? "#FFFFFF" : "#060b07";
    accent = "#16803C";
    accentHover = "#126632";
    accentTextDark = "#22C55E";
  } else if (pathname.includes("/equipment")) {
    // Slate
    bg = isDark ? "#0c0e0b" : "#FFFFFF";
    surface = isDark ? "#141712" : "#f4f6f0";
    surface2 = isDark ? "#1f241d" : "#e7eae0";
    border = isDark ? "#2c3329" : "#d1d7c4";
    muted = isDark ? "#8a9186" : "#374151";
    foreground = isDark ? "#FFFFFF" : "#0c0e0b";
    accent = "#2e7d36";
    accentHover = "#266a2d";
    accentTextDark = "#4DBE55";
  }
  const accentText = isDark ? accentTextDark : accent;

  // Chart series + status text colors: bright set on dark, darker set on light
  // so lines/bars keep >=3:1 and status text >=4.5:1 against the page.
  const chartColors = isDark
    ? ["#22C55E", "#3B82F6", "#F59E0B", "#A855F7", "#14B8A6", "#EF4444"]
    : ["#15803D", "#2563EB", "#B45309", "#7E22CE", "#0F766E", "#DC2626"];
  const statusYellowText = isDark ? "#F59E0B" : "#B45309";
  const statusRedText = isDark ? "#F87171" : "#B91C1C";
  const statusBlueText = isDark ? "#60A5FA" : "#0474C4";
  const statusGreenText = isDark ? "#05AD98" : "#0d7d6c";
  const statusOccupiedText = isDark ? "#4AB5B5" : "#267676";

  // Each brand color is exposed twice: plain hex (charts and other direct
  // var() consumers) and an "R G B" triplet, which Tailwind's
  // rgb(var(--x-rgb) / <alpha-value>) tokens need for opacity modifiers
  // like bg-brand-accent/15 to work.
  const themeVars = useMemo(() => {
    const vars: Record<string, string> = {
      "--theme-bg": bg,
      "--theme-surface": surface,
      "--theme-surface2": surface2,
      "--theme-header": header,
      "--theme-border": border,
      "--theme-muted": muted,
      "--theme-foreground": foreground,
      "--theme-accent": accent,
      "--theme-accent-hover": accentHover,
      "--theme-accent-text": accentText,
      "--chart-1": chartColors[0],
      "--chart-2": chartColors[1],
      "--chart-3": chartColors[2],
      "--chart-4": chartColors[3],
      "--chart-5": chartColors[4],
      "--chart-6": chartColors[5],
      "--status-yellow-text": statusYellowText,
      "--status-red-text": statusRedText,
      "--status-blue-text": statusBlueText,
      "--status-green-text": statusGreenText,
      "--status-occupied-text": statusOccupiedText,
    };
    for (const name of [
      "bg", "surface", "surface2", "header", "border", "muted", "foreground", "accent", "accent-hover", "accent-text",
    ]) {
      vars[`--theme-${name}-rgb`] = hexToRgbTriplet(vars[`--theme-${name}`]);
    }
    for (const name of ["yellow", "red", "blue", "green", "occupied"]) {
      vars[`--status-${name}-text-rgb`] = hexToRgbTriplet(vars[`--status-${name}-text`]);
    }
    return vars;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, surface, surface2, header, border, muted, foreground, accent, accentHover, accentText, isDark]);

  const themeStyles = themeVars as React.CSSProperties;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      for (const [name, value] of Object.entries(themeVars)) {
        root.style.setProperty(name, value);
      }

      if (themeMode === "dark") {
        root.style.colorScheme = "dark";
        root.classList.add("dark");
      } else {
        root.style.colorScheme = "light";
        root.classList.remove("dark");
      }
    }
  }, [themeVars, themeMode]);

  return (
    <div className="min-h-dvh" style={themeStyles}>
      <header className="sticky top-0 z-nav border-b border-[#1D4ED8] bg-[#2563EB] relative w-full">
        {/* Row 1: Identity & Brand & Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 relative">
          {/* Left Side: Profile & Welcome */}
          <div className="flex items-center gap-3.5 z-10">
            {user && (
              <Link
                href={profileHref}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden border-[3px] border-white/30 ring-2 ring-white/10 transition-all hover:scale-105 hover:border-white/50 active:scale-95 shadow-lg"
                title={user.name}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/20 text-white text-base font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#2563EB] shadow-sm" />
              </Link>
            )}

            <span className="hidden text-sm font-semibold tracking-wide text-white/95 sm:inline animate-fade leading-tight">
              {lang === "am" ? `እንኳን ደህና መጡ፣ ${displayName}!` : `Welcome back, ${displayName}!`}
            </span>
          </div>

          {/* Center Brand Title: Absolutely centered in the middle of Row 1 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-2.5 z-0">
            <img src="/LOGO.jpg" alt="Logo" className="h-8 w-8 rounded-xl object-cover border border-white/20 shadow-sm" />
            <span className="font-display text-2xl font-black tracking-wider text-white drop-shadow-sm select-none">
              CafeFlow
            </span>
          </div>

          {/* Right Side: Global actions or mobile toggle */}
          <div className="flex items-center gap-2 z-10">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={iconBtn}
                title={themeMode === "light" ? "Dark Mode" : "Light Mode"}
                aria-label="Toggle dark/light mode"
              >
                {themeMode === "light" ? (
                  <MoonIcon className="h-4 w-4" />
                ) : (
                  <SunIcon className="h-4 w-4 text-amber-300" />
                )}
                <span className="font-medium">{themeMode === "light" ? "Dark" : "Light"}</span>
              </button>

              <button onClick={toggle} className={iconBtn} title="Language / ቋንቋ" aria-label="Toggle language">
                <GlobeIcon className="h-4 w-4" />
                <span className="font-medium">{lang === "en" ? "አማ" : "EN"}</span>
              </button>

              <Link
                href="/notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                title={t("notifications")}
                aria-label={t("notifications")}
              >
                <BellIcon className="h-5 w-5" />
                {data?.unread ? (
                  <span className="tabular absolute -right-1 -top-1 min-w-[18px] rounded-full bg-white px-1 text-center text-[11px] font-bold leading-[18px] text-[#2563EB]">
                    {data.unread > 99 ? "99+" : data.unread}
                  </span>
                ) : null}
              </Link>

              <button onClick={logout} className={iconBtn} title={t("logout")} aria-label={t("logout")}>
                <LogOutIcon className="h-4 w-4" />
                <span className="hidden font-medium sm:inline">{t("logout")}</span>
              </button>
            </div>

            {/* Mobile Hamburger toggle button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 md:hidden"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Bottom Navigation Bar (Desktop Only) */}
        <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-black/10 border-t border-white/5 w-full">
          <nav className="flex items-center gap-1.5 text-sm overflow-x-auto scrollbar-none py-1 max-w-[70%]">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 font-bold transition-all active:scale-95 whitespace-nowrap text-xs uppercase tracking-wider",
                  isActive(n.href)
                    ? "bg-white text-[#2563EB] shadow-sm"
                    : "text-white/95 hover:bg-white/15 hover:text-white",
                )}
              >
                {navLabel(n.label)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <HeaderClock showStatus={showClock} />
            {showClock && <ClockInOut />}
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-modal max-h-[calc(100vh-100%)] overflow-y-auto border-b border-brand-border bg-brand-surface/95 backdrop-blur-lg p-4 shadow-pop md:hidden animate-fade">
            <div className="mb-4 px-4 py-2 border-b border-brand-border/60">
              <p className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                {lang === "am" ? "የካፌው መተግበሪያ" : "CafeFlow App"}
              </p>
              <p className="text-base font-bold text-brand-foreground mt-0.5">
                {lang === "am" ? `እንኳን ደህና መጡ፣ ${displayName}!` : `Welcome back, ${displayName}!`}
              </p>
            </div>
            <nav className="flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn(
                    "touch-target flex items-center rounded-xl px-4 py-3 font-medium transition-colors text-sm",
                    isActive(n.href)
                      ? "bg-brand-accent/15 text-brand-accentText"
                      : "text-brand-muted hover:bg-white/5 hover:text-brand-foreground",
                  )}
                >
                  {navLabel(n.label)}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-brand-border/60 pt-4">
              <HeaderClock compact showStatus={showClock} />
              {showClock && <ClockInOut compact />}
              <button
                onClick={toggleTheme}
                className="touch-target flex w-full items-center gap-3 rounded-xl bg-brand-surface2 px-4 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-white/10"
              >
                {themeMode === "light" ? (
                  <MoonIcon className="h-4 w-4 text-brand-muted" />
                ) : (
                  <SunIcon className="h-4 w-4 text-amber-400" />
                )}
                <span>{themeMode === "light" ? "Dark Mode" : "Light Mode"}</span>
                <span className="ml-auto font-bold text-brand-accentText">
                  {themeMode === "light" ? "Dark" : "Light"}
                </span>
              </button>

              <button
                onClick={toggle}
                className="touch-target flex w-full items-center gap-3 rounded-xl bg-brand-surface2 px-4 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-white/10"
              >
                <GlobeIcon className="h-4 w-4 text-brand-muted" />
                <span>Language / ቋንቋ</span>
                <span className="ml-auto font-bold text-brand-accentText">{lang === "en" ? "አማ" : "EN"}</span>
              </button>

              <Link
                href="/notifications"
                className="touch-target flex w-full items-center gap-3 rounded-xl bg-brand-surface2 px-4 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-white/10"
              >
                <div className="relative">
                  <BellIcon className="h-4 w-4 text-brand-muted" />
                  {data?.unread ? (
                    <span className="tabular absolute -right-1.5 -top-1.5 min-w-[16px] rounded-full bg-brand-accent px-1 text-center text-[9px] font-bold leading-[16px] text-brand-accentFg">
                      {data.unread > 99 ? "99+" : data.unread}
                    </span>
                  ) : null}
                </div>
                <span>{t("notifications")}</span>
              </Link>

              <button
                onClick={logout}
                className="touch-target flex w-full items-center gap-3 rounded-xl bg-brand-surface2 px-4 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-white/10"
              >
                <LogOutIcon className="h-4 w-4 text-status-redText" />
                <span className="text-status-redText">{t("logout")}</span>
              </button>
            </div>
          </div>
        )}
      </header>
      {banner}
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</main>
      {user?.role === "cafe_owner" && <CafeStatusFAB />}
    </div>
  );
}

