"use client";
import Link from "next/link";
import { usePoll } from "@/components/fetcher";
import { Card, Button } from "@/components/ui";
import { MessageCircleIcon, StoreIcon, ArrowRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ThreadRow {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  lastMessageAt: string;
  unreadForPlatform: boolean;
  unreadForCafe: boolean;
  tenant: { id: string; name: string };
  preview: { body: string; authorName: string } | null;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/**
 * Dashboard entry point into support. Each row deep-links with ?thread=<id>, so
 * a click lands inside the conversation rather than on the inbox — same link the
 * notifications use.
 *
 *   platform — SaaS admin dashboard, threads from every cafe
 *   cafe     — cafe owner dashboard, that cafe's own threads
 */
export function SupportSummaryCard({ side }: { side: "platform" | "cafe" }) {
  const isPlatform = side === "platform";
  const base = isPlatform ? "/saas-admin/support" : "/owner/support";
  const { data } = usePoll<{ threads: ThreadRow[] }>("/api/support/threads?limit=5", 20000);

  const threads = data?.threads ?? [];
  const unread = threads.filter((t) => (isPlatform ? t.unreadForPlatform : t.unreadForCafe)).length;
  const open = threads.filter((t) => t.status !== "RESOLVED").length;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-accent/12 text-brand-accentText">
            <MessageCircleIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-brand-foreground">
              {isPlatform ? "Support requests" : "Support"}
            </h3>
            <p className="text-xs text-brand-muted">
              {isPlatform
                ? open === 0
                  ? "No open requests from any cafe."
                  : `${open} open ${open === 1 ? "request" : "requests"} across your cafes.`
                : "Message the CafeFlow team."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-status-red/12 px-3 py-1 text-xs font-bold text-status-redText">
              <span className="h-1.5 w-1.5 rounded-full bg-status-red" />
              {unread} new
            </span>
          )}
          <Link href={base}>
            <Button size="sm">
              {isPlatform ? "Open inbox" : "Open support"}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {threads.length > 0 && (
        <div className="divide-y divide-brand-border/40">
          {threads.map((t) => {
            const isUnread = isPlatform ? t.unreadForPlatform : t.unreadForCafe;
            return (
              <Link
                key={t.id}
                href={`${base}?thread=${t.id}`}
                className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 transition-colors"
              >
                <span
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", isUnread ? "bg-status-red" : "bg-transparent")}
                  aria-label={isUnread ? "Unread" : undefined}
                />
                <div className="min-w-0 flex-1">
                  {/* Cafe name first: on the platform dashboard the whole point
                      is knowing which cafe is asking before reading further. */}
                  {isPlatform && (
                    <span className="inline-flex max-w-full items-center gap-1 text-[11px] font-bold text-brand-accentText">
                      <StoreIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t.tenant.name}</span>
                    </span>
                  )}
                  <div className={cn("truncate text-sm text-brand-foreground group-hover:text-brand-accentText", isUnread && "font-bold")}>
                    {t.subject}
                  </div>
                  {t.preview && (
                    <div className="truncate text-xs text-brand-muted">{t.preview.body}</div>
                  )}
                </div>
                <span className="tabular shrink-0 text-[11px] text-brand-muted">{timeAgo(t.lastMessageAt)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
