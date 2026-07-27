"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { Card, EmptyState } from "@/components/ui";
import { BellIcon, ArrowRightIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface N { id: string; title: string; body: string; read: boolean; createdAt: string; type: string; link: string | null }

export default function NotificationsPage() {
  const { t } = useLang();
  const router = useRouter();
  const { data, reload } = usePoll<{ notifications: N[] }>("/api/notifications", 8000);
  useEffect(() => {
    // Mark read on open.
    api("/api/notifications", { method: "POST" }).then(() => reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-3 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("notifications")}</h1>
        <button onClick={() => router.back()} className="text-sm font-medium text-brand-accentText hover:underline">{t("back")}</button>
      </div>
      {data?.notifications.length === 0 && <EmptyState icon={<BellIcon className="h-7 w-7" />}>{t("noNotifications")}</EmptyState>}
      {data?.notifications.map((n) => {
        const inner = (
          <>
            <div className="flex justify-between gap-2">
              <span className="font-medium">{n.title}</span>
              <span className="tabular shrink-0 text-xs text-brand-muted">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 text-sm text-brand-muted">{n.body}</div>
            {n.link && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-accentText">
                {t("openConversation")}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </div>
            )}
          </>
        );
        const className = cn(
          n.read ? "opacity-60" : "border-brand-accent/30",
          // Only notifications that carry a destination look clickable.
          n.link && "block transition-colors hover:border-brand-accent/60 hover:opacity-100",
        );
        // A notification with a link goes straight to what it is about — for
        // support, that is the conversation itself, not just the inbox.
        return n.link ? (
          <Link key={n.id} href={n.link} className="block">
            <Card className={className}>{inner}</Card>
          </Link>
        ) : (
          <Card key={n.id} className={className}>{inner}</Card>
        );
      })}
    </main>
  );
}
