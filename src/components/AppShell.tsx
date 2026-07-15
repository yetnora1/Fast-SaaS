"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { ClockInOut } from "@/components/ClockInOut";
import { HeaderClock } from "@/components/HeaderClock";
import { useLang } from "@/lib/i18n";
import { cn, getAvatarUrl } from "@/lib/utils";
import { BellIcon, GlobeIcon, LogOutIcon, SunIcon, MoonIcon } from "@/components/icons";
import { CafeStatusFAB } from "@/components/CafeStatusFAB";

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
    if (user.role === "saas_owner") profileHref = "/saas-admin/profile";
    else if (user.role === "store_manager") profileHref = "/store/profile";
    else if (user.role === "cafe_manager") profileHref = "/manager/profile";
    else if (user.role === "cafe_owner") profileHref = "/owner/profile";
    else profileHref = `/${user.role}/profile`;
  }

  const showClock = Boolean(user?.role && user.role !== "saas_owner");
  const isDark = themeMode === "dark";

  // Clean, consistent palette — no per-route color switching
  const bg = isDark ? "#09090b" : "#ffffff";
  const surface = isDark ? "#18181b" : "#f4f4f5";
  const surface2 = isDark ? "#27272a" : "#e4e4e7";
  const header = isDark ? "#09090b" : "#18181b";
  const border = isDark ? "#3f3f46" : "#d4d4d8";
  const muted = isDark ? "#a1a1aa" : "#71717a";
  const foreground = isDark ? "#fafafa" : "#09090b";
  const accent = "#14b8a6";
  const accentHover = "#0d9488";
  const accentText = isDark ? "#2dd4bf" : "#0d9488";

  // Chart + status text colors
  const chartColors = isDark
    ? ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444"]
    : ["#059669", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#dc2626"];
  const statusYellowText = isDark ? "#fbbf24" : "#d97706";
  const statusRedText = isDark ? "#f87171" : "#dc2626";
  const statusBlueText = isDark ? "#60a5fa" : "#2563eb";
  const statusGreenText = isDark ? "#34d399" : "#059669";
  const statusOccupiedText = isDark ? "#22d3ee" : "#0891b2";

  const themeVars = useMemo(() => {
    const vars: Record<string, string> = {
      "--theme-bg": bg, "--theme-surface": surface, "--theme-surface2": surface2,
      "--theme-header": header, "--theme-border": border, "--theme-muted": muted,
      "--theme-foreground": foreground, "--theme-accent": accent,
      "--theme-accent-hover": accentHover, "--theme-accent-text": accentText,
      "--chart-1": chartColors[0], "--chart-2": chartColors[1], "--chart-3": chartColors[2],
      "--chart-4": chartColors[3], "--chart-5": chartColors[4], "--chart-6": chartColors[5],
      "--status-yellow-text": statusYellowText, "--status-red-text": statusRedText,
      "--status-blue-text": statusBlueText, "--status-green-text": statusGreenText,
      "--status-occupied-text": statusOccupiedText,
    };
    for (const name of ["bg", "surface", "surface2", "header", "border", "muted", "foreground", "accent", "accent-hover", "accent-text"]) {
      vars[`--theme-${name}-rgb`] = hexToRgbTriplet(vars[`--theme-${name}`]);
    }
    for (const name of ["yellow", "red", "blue", "green", "occupied"]) {
      vars[`--status-${name}-text-rgb`] = hexToRgbTriplet(vars[`--status-${name}-text`]);
    }
    return vars;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

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

  const iconBtn = "inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 transition-colors hover:bg-white/10";

  return (
    <div className="min-h-dvh" style={themeStyles}>
      <header className="sticky top-0 z-nav border-b border-zinc-800 bg-brand-header relative w-full">
        {/* Row 1 */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 relative">
          <div className="flex items-center gap-3 z-10">
            {user && (
              <Link
                href={profileHref}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-white/20 transition-all hover:border-white/40 active:scale-95"
                title={user.name}
              >
                {user.avatarUrl ? (
                  <img src={getAvatarUrl(user.avatarUrl) || ""} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-accent/20 text-brand-accentText text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-brand-header" />
              </Link>
            )}
            <span className="hidden text-sm font-medium text-white/70 sm:inline leading-tight">
              {displayName}
            </span>
          </div>

          {/* Center Brand */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-0">
            <img src="/LOGO.jpg" alt="Logo" className="h-6 w-6 rounded-full object-cover border border-white/10" />
            <span className="font-display text-lg font-bold tracking-wide text-white select-none">
              CafeFlow
            </span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1.5 z-10">
            <div className="hidden md:flex items-center gap-1.5">
              <button onClick={toggleTheme} className={iconBtn} aria-label="Toggle theme">
                {themeMode === "light" ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4 text-amber-300" />}
                <span className="font-medium">{themeMode === "light" ? "Dark" : "Light"}</span>
              </button>
              <button onClick={toggle} className={iconBtn} aria-label="Toggle language">
                <GlobeIcon className="h-4 w-4" />
                <span className="font-medium">{lang === "en" ? "አማ" : "EN"}</span>
              </button>
              <Link
                href="/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white/90 transition-colors hover:bg-white/10"
                aria-label={t("notifications")}
              >
                <BellIcon className="h-4 w-4" />
                {data?.unread ? (
                  <span className="tabular absolute -right-1 -top-1 min-w-[16px] rounded-full bg-brand-accent px-1 text-center text-[10px] font-bold leading-[16px] text-white">
                    {data.unread > 99 ? "99+" : data.unread}
                  </span>
                ) : null}
              </Link>
              <button onClick={logout} className={iconBtn} aria-label={t("logout")}>
                <LogOutIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white transition-colors hover:bg-white/10 md:hidden"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Desktop Nav */}
        <div className="hidden md:flex items-center justify-between px-6 py-1.5 border-t border-white/5 w-full">
          <nav className="flex items-center gap-0.5 text-sm overflow-x-auto scrollbar-none py-1 max-w-[70%]">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors whitespace-nowrap text-xs tracking-wide",
                  isActive(n.href)
                    ? "bg-brand-accent text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90",
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

        {/* Mobile Drawer */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-modal max-h-[calc(100vh-100%)] overflow-y-auto border-b border-brand-border bg-brand-surface/98 backdrop-blur-xl p-4 shadow-pop md:hidden animate-fade">
            <nav className="flex flex-col gap-0.5">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2.5 font-medium transition-colors text-sm min-h-[44px]",
                    isActive(n.href)
                      ? "bg-brand-accent/15 text-brand-accentText"
                      : "text-brand-muted hover:bg-brand-surface2 hover:text-brand-foreground",
                  )}
                >
                  {navLabel(n.label)}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-brand-border/60 pt-3">
              <HeaderClock compact showStatus={showClock} />
              {showClock && <ClockInOut compact />}
              <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-md bg-brand-surface2 px-3 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-surface2/80 min-h-[44px]">
                {themeMode === "light" ? <MoonIcon className="h-4 w-4 text-brand-muted" /> : <SunIcon className="h-4 w-4 text-amber-400" />}
                <span>{themeMode === "light" ? "Dark Mode" : "Light Mode"}</span>
              </button>
              <button onClick={toggle} className="flex w-full items-center gap-3 rounded-md bg-brand-surface2 px-3 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-surface2/80 min-h-[44px]">
                <GlobeIcon className="h-4 w-4 text-brand-muted" />
                <span>Language / ቋንቋ</span>
                <span className="ml-auto font-bold text-brand-accentText">{lang === "en" ? "አማ" : "EN"}</span>
              </button>
              <Link href="/notifications" className="flex w-full items-center gap-3 rounded-md bg-brand-surface2 px-3 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-surface2/80 min-h-[44px]">
                <div className="relative">
                  <BellIcon className="h-4 w-4 text-brand-muted" />
                  {data?.unread ? (
                    <span className="tabular absolute -right-1.5 -top-1.5 min-w-[14px] rounded-full bg-brand-accent px-1 text-center text-[9px] font-bold leading-[14px] text-white">
                      {data.unread > 99 ? "99+" : data.unread}
                    </span>
                  ) : null}
                </div>
                <span>{t("notifications")}</span>
              </Link>
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-md bg-brand-surface2 px-3 py-2.5 text-sm font-medium text-status-redText transition-colors hover:bg-brand-surface2/80 min-h-[44px]">
                <LogOutIcon className="h-4 w-4" />
                <span>{t("logout")}</span>
              </button>
            </div>
          </div>
        )}
      </header>
      {banner}
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      {user?.role === "cafe_owner" && <CafeStatusFAB />}
    </div>
  );
}
