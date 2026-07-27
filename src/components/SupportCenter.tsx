"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, Input, Select, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { MessageCircleIcon, StoreIcon, PlusIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────── */

type Category = "PROBLEM" | "MODIFICATION" | "QUESTION" | "BILLING";
type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface ThreadRow {
  id: string;
  subject: string;
  category: Category;
  status: Status;
  openedByName: string;
  lastMessageAt: string;
  createdAt: string;
  unreadForPlatform: boolean;
  unreadForCafe: boolean;
  tenant: { id: string; name: string };
  messageCount: number;
  preview: { body: string; authorName: string; authorRole: string } | null;
}

interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

/* ── Presentation maps ─────────────────────────────────────────────── */

const CATEGORY_LABEL: Record<Category, string> = {
  PROBLEM: "Problem",
  MODIFICATION: "Modification",
  QUESTION: "Question",
  BILLING: "Billing",
};

// Category reads as a tint, status as a solid chip — so the eye separates
// "what kind of request" from "where it stands" without reading the words.
const CATEGORY_TONE: Record<Category, string> = {
  PROBLEM: "bg-status-red/12 text-status-redText",
  MODIFICATION: "bg-status-blue/12 text-status-blueText",
  QUESTION: "bg-status-yellow/15 text-status-yellowText",
  BILLING: "bg-status-green/12 text-status-greenText",
};

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

const STATUS_TONE: Record<Status, string> = {
  OPEN: "bg-status-yellow/15 text-status-yellowText",
  IN_PROGRESS: "bg-status-blue/15 text-status-blueText",
  RESOLVED: "bg-status-green/15 text-status-greenText",
};

const STATUS_ICON: Record<Status, React.ReactNode> = {
  OPEN: <AlertTriangleIcon className="h-3 w-3" />,
  IN_PROGRESS: <ClockIcon className="h-3 w-3" />,
  RESOLVED: <CheckCircleIcon className="h-3 w-3" />,
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Component ─────────────────────────────────────────────────────── */

/**
 * One component drives both sides of the conversation so they can never drift
 * apart. `side` decides who may start a thread, who may resolve it, and which
 * unread flag counts.
 *
 *   cafe     — the cafe owner's own requests
 *   platform — the SaaS owner's cross-tenant inbox
 */
export function SupportCenter({ side }: { side: "cafe" | "platform" }) {
  const { navLabel } = useLang();
  const isPlatform = side === "platform";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [tenantFilter, setTenantFilter] = useState("");
  // `?thread=<id>` is the deep link used by notifications and the dashboard
  // card, so both land inside the conversation rather than on the inbox.
  const [openId, setOpenId] = useState<string | null>(searchParams.get("thread"));
  const [composeOpen, setComposeOpen] = useState(false);

  // Follow the URL when it changes underneath us (a second notification click
  // while the page is already open would otherwise do nothing).
  const linkedId = searchParams.get("thread");
  const [lastLinked, setLastLinked] = useState(linkedId);
  if (linkedId !== lastLinked) {
    setLastLinked(linkedId);
    setOpenId(linkedId);
  }

  function closeThread() {
    setOpenId(null);
    // Drop ?thread= so a refresh or back-navigation doesn't reopen it.
    if (searchParams.get("thread")) router.replace(pathname, { scroll: false });
  }

  const query = new URLSearchParams();
  if (statusFilter !== "ALL") query.set("status", statusFilter);
  if (isPlatform && tenantFilter) query.set("tenantId", tenantFilter);
  const listUrl = `/api/support/threads${query.toString() ? `?${query}` : ""}`;

  const { data, loading, reload } = usePoll<{ threads: ThreadRow[]; tenants: { id: string; name: string }[] }>(listUrl, 15000);
  const threads = useMemo(() => data?.threads ?? [], [data]);
  const unreadCount = threads.filter((t) => (isPlatform ? t.unreadForPlatform : t.unreadForCafe)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={isPlatform ? navLabel("Support Inbox") : navLabel("Support")}
        subtitle={
          isPlatform
            ? "Requests from every cafe on the platform, newest first."
            : "Report a problem or request a change. The CafeFlow team replies here."
        }
      >
        {unreadCount > 0 && (
          <span className="tabular inline-flex items-center gap-1.5 rounded-full bg-status-red/12 px-3 py-1 text-xs font-bold text-status-redText">
            <span className="h-1.5 w-1.5 rounded-full bg-status-red" />
            {unreadCount} unread
          </span>
        )}
        {!isPlatform && (
          <Button onClick={() => setComposeOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            New request
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "bg-brand-accent text-white"
                : "border border-brand-border bg-brand-surface text-brand-muted hover:text-brand-foreground",
            )}
          >
            {s === "ALL" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
        {isPlatform && (data?.tenants.length ?? 0) > 0 && (
          <Select
            className="ml-auto w-auto min-w-[12rem]"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            aria-label="Filter by cafe"
          >
            <option value="">All cafes</option>
            {data?.tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        )}
      </div>

      {loading && !data && <div className="flex justify-center py-10"><Spinner /></div>}

      {data && threads.length === 0 && (
        <EmptyState icon={<MessageCircleIcon className="h-7 w-7" />}>
          {isPlatform
            ? "No support requests match this filter."
            : "No requests yet. Open one and the CafeFlow team will get back to you here."}
        </EmptyState>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {threads.map((t) => (
          <ThreadCard key={t.id} thread={t} isPlatform={isPlatform} onOpen={() => setOpenId(t.id)} />
        ))}
      </div>

      {openId && (
        <ThreadModal
          threadId={openId}
          isPlatform={isPlatform}
          onClose={() => { closeThread(); reload(); }}
          onChanged={reload}
        />
      )}

      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onSent={() => { setComposeOpen(false); reload(); }} />
      )}
    </div>
  );
}

/* ── Thread list card ──────────────────────────────────────────────── */

function ThreadCard({ thread, isPlatform, onOpen }: { thread: ThreadRow; isPlatform: boolean; onOpen: () => void }) {
  const unread = isPlatform ? thread.unreadForPlatform : thread.unreadForCafe;
  return (
    <Card
      as="article"
      className={cn(
        "cursor-pointer space-y-3 p-4 transition-colors hover:border-brand-accent/40",
        unread && "border-brand-accent/50",
      )}
    >
      <button onClick={onOpen} className="w-full space-y-3 text-left">
        {/* The cafe name is the first thing on the card — on the platform inbox
            it answers "who is this from" before the subject is even read. */}
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-brand-accent/12 px-2.5 py-1 text-xs font-bold text-brand-accentText">
            <StoreIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{thread.tenant.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {unread && <span className="h-2 w-2 rounded-full bg-status-red" aria-label="Unread" />}
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[thread.status])}>
              {STATUS_ICON[thread.status]}
              {STATUS_LABEL[thread.status]}
            </span>
          </span>
        </div>

        <div>
          <h3 className={cn("truncate font-display text-base font-bold text-brand-foreground", unread && "font-extrabold")}>
            {thread.subject}
          </h3>
          {thread.preview && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-brand-muted">
              <span className="font-medium text-brand-foreground/80">{thread.preview.authorName}:</span> {thread.preview.body}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-muted">
          <span className={cn("rounded-full px-2 py-0.5 font-semibold", CATEGORY_TONE[thread.category])}>
            {CATEGORY_LABEL[thread.category]}
          </span>
          <span className="tabular">{thread.messageCount} {thread.messageCount === 1 ? "message" : "messages"}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(thread.lastMessageAt)}</span>
          <span aria-hidden>·</span>
          <span className="truncate">opened by {thread.openedByName}</span>
        </div>
      </button>
    </Card>
  );
}

/* ── Conversation ──────────────────────────────────────────────────── */

function ThreadModal({
  threadId, isPlatform, onClose, onChanged,
}: { threadId: string; isPlatform: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, reload } = usePoll<{ thread: ThreadRow; messages: Message[] }>(`/api/support/threads/${threadId}`, 10000);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows, the way any
  // chat does — without this a long thread opens scrolled to its oldest line.
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);

  async function send() {
    const body = reply.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/support/threads/${threadId}/messages`, { method: "POST", body: JSON.stringify({ body }) });
      setReply("");
      reload();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: Status) {
    setBusy(true);
    try {
      await api(`/api/support/threads/${threadId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      reload();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const thread = data?.thread;
  const resolvedForCafe = thread?.status === "RESOLVED" && !isPlatform;

  return (
    <Modal open onClose={onClose} title={thread?.subject ?? "Conversation"} className="max-w-2xl">
      {!data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {/* Header: cafe name stays visible for the whole conversation, so a
              platform owner replying to ten threads never loses the context. */}
          <div className="flex flex-wrap items-center gap-2 border-b border-brand-border pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent/12 px-2.5 py-1 text-xs font-bold text-brand-accentText">
              <StoreIcon className="h-3.5 w-3.5" />
              {thread!.tenant.name}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", CATEGORY_TONE[thread!.category])}>
              {CATEGORY_LABEL[thread!.category]}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[thread!.status])}>
              {STATUS_ICON[thread!.status]}
              {STATUS_LABEL[thread!.status]}
            </span>
          </div>

          {/* Messages */}
          <div
            className="max-h-[46vh] space-y-3 overflow-y-auto rounded-xl p-3"
            style={{ background: "var(--chat-canvas)" }}
          >
            {data.messages.map((m) => {
              // "Mine" is by side, not by user id: any platform owner replying
              // reads as the platform, and the cafe sees one consistent voice.
              const mine = isPlatform ? m.authorRole === "saas_owner" : m.authorRole !== "saas_owner";
              return (
                <div key={m.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                  <span className="px-1 text-[11px] font-medium text-brand-muted">
                    {m.authorName}
                    {m.authorRole === "saas_owner" && <span className="ml-1 font-bold text-brand-accentText">· CafeFlow</span>}
                  </span>
                  <div
                    className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-card"
                    style={{
                      background: mine ? "var(--chat-mine)" : "var(--chat-theirs)",
                      color: mine ? "var(--chat-mine-text)" : "var(--chat-theirs-text)",
                    }}
                  >
                    {m.body}
                  </div>
                  <span className="px-1 text-[10px] text-brand-muted">{timeAgo(m.createdAt)}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {error && <p className="text-sm text-status-redText">{error}</p>}

          {/* Composer */}
          {resolvedForCafe ? (
            <p className="rounded-lg bg-brand-surface2 px-3 py-2.5 text-xs text-brand-muted">
              This request is resolved. Open a new one to continue the conversation.
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter makes a new line — chat convention.
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={2}
                placeholder="Write a reply…"
                className="min-h-[48px] w-full resize-none rounded-lg border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground outline-none transition-colors placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
              <Button onClick={send} loading={busy} disabled={!reply.trim()}>Send</Button>
            </div>
          )}

          {isPlatform && (
            <div className="flex flex-wrap gap-2 border-t border-brand-border pt-3">
              <span className="self-center text-xs font-medium text-brand-muted">Set status:</span>
              {(["OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={busy || thread!.status === s}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
                    thread!.status === s ? "bg-brand-accent text-white" : "border border-brand-border text-brand-muted hover:text-brand-foreground",
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── New request (cafe owner only) ─────────────────────────────────── */

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("PROBLEM");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/support/threads", { method: "POST", body: JSON.stringify({ subject, category, body }) });
      onSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New support request" className="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Subject" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Printer not receiving tickets" required />
        </Field>
        <Field label="Type" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Message" required hint="Your cafe name is attached automatically.">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            required
            placeholder="Describe the problem or the change you need…"
            className="w-full resize-none rounded-lg border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground outline-none transition-colors placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          />
        </Field>
        {error && <p className="text-sm text-status-redText">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={busy} disabled={!subject.trim() || !body.trim()}>Send</Button>
        </div>
      </form>
    </Modal>
  );
}
