"use client";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { useLang } from "@/lib/i18n";
import type { Role } from "@prisma/client";
import { TrendUpIcon, TrendDownIcon } from "@/components/icons";

/* ── Surfaces ─────────────────────────────────────────────────────── */

export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={cn(
        "rounded-xl border border-brand-border bg-brand-surface p-5 shadow-card",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** Standard section/page heading with optional subtitle and right-aligned action. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border/70 pb-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] text-brand-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-6 text-brand-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/* ── KPI / stats ──────────────────────────────────────────────────── */

const TONE_RING: Record<string, string> = {
  green: "text-status-greenText",
  red: "text-status-redText",
  yellow: "text-status-yellowText",
  blue: "text-status-blueText",
  accent: "text-brand-accentText",
};

export function KPICard({
  label,
  value,
  delta,
  trend,
  icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon?: React.ReactNode;
  tone?: keyof typeof TONE_RING;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-muted">{label}</div>
        {icon && <span className={cn("opacity-80", TONE_RING[tone])}>{icon}</span>}
      </div>
      <div className="tabular mt-3 text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-brand-foreground">{value}</div>
      {delta && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            trend === "up" && "text-status-greenText",
            trend === "down" && "text-status-redText",
            !trend && "text-brand-muted",
          )}
        >
          {trend === "up" && <TrendUpIcon className="h-3.5 w-3.5" />}
          {trend === "down" && <TrendDownIcon className="h-3.5 w-3.5" />}
          {delta}
        </div>
      )}
    </Card>
  );
}

/* ── Controls ─────────────────────────────────────────────────────── */

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150 active:translate-y-px",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "md" ? "min-h-[48px] min-w-[48px] px-4 py-2 text-sm" : "min-h-[40px] px-3 py-1.5 text-sm",
        variant === "primary" && "bg-brand-accent text-white hover:bg-brand-accentHover",
        variant === "ghost" && "border border-brand-border bg-transparent text-brand-foreground hover:bg-brand-surface2",
        variant === "danger" && "bg-status-redSolid text-white hover:bg-red-700",
        className,
      )}
    >
      {loading && <Spinner className="border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "touch-target w-full rounded-lg border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground outline-none transition-colors",
        "placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20",
        props.className,
      )}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "touch-target w-full cursor-pointer rounded-lg border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground outline-none transition-colors",
        "focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20",
        className,
      )}
    >
      {children}
    </select>
  );
}

/** Labeled field wrapper — visible label (skill: not placeholder-only). */
export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-brand-foreground">
        {label}
        {required && <span className="ml-0.5 text-status-redText">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-brand-muted">{hint}</span>}
    </label>
  );
}

/* ── Feedback / states ────────────────────────────────────────────── */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-brand-accent", className)}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Skeleton block for loading placeholders (skill: skeleton > blocking spinner). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden="true" />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("space-y-3", className)}>
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-3 w-1/4" />
    </Card>
  );
}

export function EmptyState({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="animate-fade flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-brand-muted">
      {icon && <span className="text-brand-muted/70">{icon}</span>}
      <p>{children}</p>
    </div>
  );
}

/* ── Badges / chips ───────────────────────────────────────────────── */

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs font-medium text-brand-accentText">
      {ROLE_LABEL[role]}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OK: "bg-status-green/15 text-status-greenText",
  LOW: "bg-status-yellow/15 text-status-yellowText",
  CRITICAL: "bg-status-red/15 text-status-redText",
  available: "bg-status-green/15 text-status-greenText",
  occupied: "bg-status-occupied/15 text-status-occupiedText",
  attention: "bg-status-red/15 text-status-redText",
  PENDING_CASHIER: "bg-status-yellow/15 text-status-yellowText",
  DECLINED: "bg-status-red/15 text-status-redText",
};

export function StatusChip({ status }: { status: string }) {
  const { statusLabel } = useLang();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ?? "bg-white/10 text-slate-300",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

/** Live polling indicator — pulsing green dot + label. */
export function LiveDot({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-muted">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-status-green/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-green" />
      </span>
      {label}
    </span>
  );
}

/* ── Overlays ─────────────────────────────────────────────────────── */

/** Themed modal dialog — scrim 60% + blur, single z-index scale token. */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="animate-fade fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "animate-in w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-pop",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-brand-muted transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── KDS timer ────────────────────────────────────────────────────── */

/** Color timer: green <5min, yellow 5-10min, red >10min (KDS spec). */
export function TimerBadge({ since }: { since: string | Date }) {
  const ms = Date.now() - new Date(since).getTime();
  const min = Math.floor(ms / 60000);
  const color = min < 5 ? "text-status-greenText" : min < 10 ? "text-status-yellowText" : "text-status-redText";
  return (
    <span className={cn("tabular font-mono text-sm font-bold", color)}>
      {min}:{String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}
    </span>
  );
}
