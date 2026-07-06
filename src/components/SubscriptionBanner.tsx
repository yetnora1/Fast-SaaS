import Link from "next/link";
import type { SubscriptionStatus } from "@/lib/subscription";
import { AlertTriangleIcon, ClockIcon } from "@/components/icons";

// Header banners for TRIAL/WARNING/GRACE/PENDING states (spec §2.2 / §18).
export function SubscriptionBanner({ status }: { status: SubscriptionStatus }) {
  const base = "flex items-center gap-2 px-4 py-2 text-sm font-medium";
  if (status.state === "WARNING") {
    return (
      <div className={`${base} bg-status-yellow/15 text-status-yellow`}>
        <AlertTriangleIcon className="h-4 w-4" />
        <span>Subscription expires in {status.subDaysLeft} days. Renew to avoid lockout.</span>
        <PayNowButton className="bg-status-yellow text-black hover:opacity-90" />
      </div>
    );
  }
  if (status.state === "GRACE") {
    return (
      <div className={`${base} bg-status-red/15 text-status-red`}>
        <AlertTriangleIcon className="h-4 w-4" />
        <span>Subscription expired — service suspended in {status.graceDaysLeft} days. (View-only access)</span>
        <PayNowButton className="bg-status-red text-white hover:opacity-90" />
      </div>
    );
  }
  if (status.state === "TRIAL") {
    const remainingText = status.trialTimeLeftText || `${status.trialDaysLeft} days`;
    return (
      <div className={`${base} bg-brand-accent/15 text-brand-accent`}>
        <ClockIcon className="h-4 w-4" />
        <span>Trial: {remainingText} remaining.</span>
        <PayNowButton className="bg-brand-accent text-brand-accentFg hover:opacity-90" />
      </div>
    );
  }
  if (status.state === "PENDING") {
    return (
      <div className={`${base} bg-status-blue/15 text-status-blue`}>
        <ClockIcon className="h-4 w-4" />
        Receipt under review — read-only access until approved.
      </div>
    );
  }
  return null;
}

// Pay-now CTA — links owners/managers straight to the payment gate so they can
// subscribe before the trial (or grace window) ends, without waiting for lockout.
function PayNowButton({ className }: { className: string }) {
  return (
    <Link
      href="/subscription/gate"
      className={`ml-auto shrink-0 rounded-lg px-3 py-1 text-xs font-bold transition-opacity ${className}`}
    >
      Pay now
    </Link>
  );
}
