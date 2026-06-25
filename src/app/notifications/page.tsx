"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { Card, EmptyState } from "@/components/ui";
import { BellIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface N { id: string; title: string; body: string; read: boolean; createdAt: string; type: string }

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
        <button onClick={() => router.back()} className="text-sm font-medium text-brand-accent hover:underline">{t("back")}</button>
      </div>
      {data?.notifications.length === 0 && <EmptyState icon={<BellIcon className="h-7 w-7" />}>{t("noNotifications")}</EmptyState>}
      {data?.notifications.map((n) => (
        <Card key={n.id} className={n.read ? "opacity-60" : "border-brand-accent/30"}>
          <div className="flex justify-between gap-2">
            <span className="font-medium">{n.title}</span>
            <span className="tabular shrink-0 text-xs text-brand-muted">{new Date(n.createdAt).toLocaleString()}</span>
          </div>
          <div className="mt-1 text-sm text-brand-muted">{n.body}</div>
        </Card>
      ))}
    </main>
  );
}
