import type { SubscriptionStatus } from "@/lib/subscription";
import { AlertTriangleIcon, ClockIcon } from "@/components/icons";

// Header banners for TRIAL/WARNING/GRACE/PENDING states (spec §2.2 / §18).
export function SubscriptionBanner({ status }: { status: SubscriptionStatus }) {
  const base = "flex items-center gap-2 px-4 py-2 text-sm font-medium";
  if (status.state === "WARNING") {
    return (
      <div className={`${base} bg-status-yellow/15 text-status-yellow`}>
        <AlertTriangleIcon className="h-4 w-4" />
        Subscription expires in {status.subDaysLeft} days. Renew to avoid lockout.
      </div>
    );
  }
  if (status.state === "GRACE") {
    return (
      <div className={`${base} bg-status-red/15 text-status-red`}>
        <AlertTriangleIcon className="h-4 w-4" />
        Subscription expired — service suspended in {status.graceDaysLeft} days. Pay now. (View-only access)
      </div>
    );
  }
  if (status.state === "TRIAL") {
    const remainingText = status.trialTimeLeftText || `${status.trialDaysLeft} days`;
    return (
      <div className={`${base} bg-brand-accent/15 text-brand-accent`}>
        <ClockIcon className="h-4 w-4" />
        Trial: {remainingText} remaining.
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
