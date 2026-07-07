"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { ClockInOut } from "@/components/ClockInOut";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BellIcon, GlobeIcon, LogOutIcon } from "@/components/icons";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      profileHref = "/saas-admin/dashboard";
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
    "inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-surface2 px-2.5 text-sm text-brand-foreground transition-colors hover:bg-white/10";

  // Attendance: every staff role clocks in/out; owners and platform admin don't.
  const showClock = Boolean(user?.role && user.role !== "cafe_owner" && user.role !== "saas_owner");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-nav border-b border-brand-border/70 bg-brand-surface/80 backdrop-blur-md relative">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <span className="font-display text-lg font-bold tracking-tight">
            Cafe<span className="text-brand-accent">Flow</span>
          </span>

          {user && (
            <Link
              href={profileHref}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-brand-border transition-all hover:scale-105 hover:border-brand-accent active:scale-95 shadow-md"
              title={user.name}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-accent/15 text-brand-accent text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          )}

          <span className="hidden text-sm text-brand-muted sm:inline">{navLabel(title)}</span>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex ml-2 items-center gap-1 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium transition-colors",
                  isActive(n.href)
                    ? "bg-brand-accent/15 text-brand-accent"
                    : "text-brand-muted hover:bg-white/5 hover:text-brand-foreground",
                )}
              >
                {navLabel(n.label)}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex ml-auto items-center gap-2">
            {showClock && <ClockInOut />}
            <button onClick={toggle} className={iconBtn} title="Language / ቋንቋ" aria-label="Toggle language">
              <GlobeIcon className="h-4 w-4" />
              <span className="font-medium">{lang === "en" ? "አማ" : "EN"}</span>
            </button>

            <Link
              href="/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface2 text-brand-foreground transition-colors hover:bg-white/10"
              title={t("notifications")}
              aria-label={t("notifications")}
            >
              <BellIcon className="h-5 w-5" />
              {data?.unread ? (
                <span className="tabular absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand-accent px-1 text-center text-[11px] font-bold leading-[18px] text-brand-accentFg">
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
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-surface2 text-brand-foreground transition-colors hover:bg-white/10 md:hidden"
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

        {/* Mobile Drawer Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-modal max-h-[calc(100vh-100%)] overflow-y-auto border-b border-brand-border bg-brand-surface/95 backdrop-blur-lg p-4 shadow-pop md:hidden animate-fade">
            <nav className="flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cn(
                    "touch-target flex items-center rounded-xl px-4 py-3 font-medium transition-colors text-sm",
                    isActive(n.href)
                      ? "bg-brand-accent/15 text-brand-accent"
                      : "text-brand-muted hover:bg-white/5 hover:text-brand-foreground",
                  )}
                >
                  {navLabel(n.label)}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-brand-border/60 pt-4">
              {showClock && <ClockInOut compact />}
              <button
                onClick={toggle}
                className="touch-target flex w-full items-center gap-3 rounded-xl bg-brand-surface2 px-4 py-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-white/10"
              >
                <GlobeIcon className="h-4 w-4 text-brand-muted" />
                <span>Language / ቋንቋ</span>
                <span className="ml-auto font-bold text-brand-accent">{lang === "en" ? "አማ" : "EN"}</span>
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
                <LogOutIcon className="h-4 w-4 text-status-red" />
                <span className="text-status-red">{t("logout")}</span>
              </button>
            </div>
          </div>
        )}
      </header>
      {banner}
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

