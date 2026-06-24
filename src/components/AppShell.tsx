"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const iconBtn =
    "inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-surface2 px-2.5 text-sm text-brand-foreground transition-colors hover:bg-white/10";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-nav border-b border-brand-border/70 bg-brand-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <span className="font-display text-lg font-bold tracking-tight">
            Cafe<span className="text-brand-accent">Flow</span>
          </span>
          <span className="hidden text-sm text-brand-muted sm:inline">{navLabel(title)}</span>

          <nav className="ml-2 flex flex-wrap items-center gap-1 text-sm">
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

          <div className="ml-auto flex items-center gap-2">
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
        </div>
      </header>
      {banner}
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
