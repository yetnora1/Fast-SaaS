import { prisma } from "@/lib/db/client";
import { config } from "@/lib/config";

// Subscription gate states. Defined here (not in Prisma) because the gate state is
// derived at runtime from tenant + subscription records, not stored as a column.
export type SubscriptionState = "TRIAL" | "PENDING" | "ACTIVE" | "WARNING" | "GRACE" | "EXPIRED" | "SUSPENDED";

export interface SubscriptionStatus {
  state: SubscriptionState;
  trialDaysLeft: number | null;
  subDaysLeft: number | null;
  graceDaysLeft: number | null;
  trialTimeLeftText?: string | null;
  /** true => allow full access; false => read-only or locked (see `locked`). */
  fullAccess: boolean;
  /** true => block all tenant routes, show gate modal. */
  locked: boolean;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Subscription gate state machine — the MySQL/app-layer equivalent of the
 * PostgreSQL `check_subscription_status()` stored procedure.
 *
 * States: TRIAL → PENDING → ACTIVE → WARNING → GRACE → EXPIRED, plus SUSPENDED.
 */
export async function checkSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { state: "EXPIRED", trialDaysLeft: null, subDaysLeft: null, graceDaysLeft: null, fullAccess: false, locked: true };
  }

  if (tenant.status === "suspended" || tenant.status === "terminated") {
    return { state: "SUSPENDED", trialDaysLeft: null, subDaysLeft: null, graceDaysLeft: null, fullAccess: false, locked: true };
  }

  const now = new Date();

  // Pending receipt under review → read-only.
  const pending = await prisma.subscription.findFirst({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (pending) {
    return { state: "PENDING", trialDaysLeft: null, subDaysLeft: null, graceDaysLeft: null, fullAccess: false, locked: false };
  }

  // Active subscription window.
  if (tenant.subEnd) {
    const subDaysLeft = daysBetween(now, tenant.subEnd);
    if (subDaysLeft > config.subscription.warningDays) {
      return { state: "ACTIVE", trialDaysLeft: null, subDaysLeft, graceDaysLeft: null, fullAccess: true, locked: false };
    }
    if (subDaysLeft > 0) {
      return { state: "WARNING", trialDaysLeft: null, subDaysLeft, graceDaysLeft: null, fullAccess: true, locked: false };
    }
    // Expired — within grace?
    const graceEnd = new Date(tenant.subEnd);
    graceEnd.setDate(graceEnd.getDate() + config.subscription.graceDays);
    const graceDaysLeft = daysBetween(now, graceEnd);
    if (graceDaysLeft > 0) {
      return { state: "GRACE", trialDaysLeft: null, subDaysLeft, graceDaysLeft, fullAccess: false, locked: false };
    }
    return { state: "EXPIRED", trialDaysLeft: null, subDaysLeft, graceDaysLeft: 0, fullAccess: false, locked: true };
  }

  // No subscription yet → trial window.
  if (tenant.trialEnd) {
    const diffMs = tenant.trialEnd.getTime() - now.getTime();
    if (diffMs > 0) {
      const trialDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      let trialTimeLeftText = `${trialDaysLeft} days`;
      if (diffMs < 60 * 1000 * 60) {
        const mins = Math.ceil(diffMs / (60 * 1000));
        trialTimeLeftText = `${mins} minute${mins > 1 ? "s" : ""}`;
      } else if (diffMs < 24 * 60 * 60 * 1000) {
        const hrs = Math.ceil(diffMs / (60 * 60 * 1000));
        trialTimeLeftText = `${hrs} hour${hrs > 1 ? "s" : ""}`;
      }
      return { state: "TRIAL", trialDaysLeft, subDaysLeft: null, graceDaysLeft: null, trialTimeLeftText, fullAccess: true, locked: false };
    }
  }

  // Trial elapsed, nothing paid → locked behind gate.
  return { state: "EXPIRED", trialDaysLeft: 0, subDaysLeft: null, graceDaysLeft: null, fullAccess: false, locked: true };
}

export interface DynamicPaymentConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
}

export async function getDynamicPaymentConfig(): Promise<DynamicPaymentConfig> {
  try {
    const rows = await prisma.platformConfig.findMany({
      where: {
        key: { in: ["bank_name", "account_number", "account_name", "subscription_amount"] }
      }
    });

    const configMap = new Map(rows.map(r => [r.key, r.value]));

    const dbAmountStr = configMap.get("subscription_amount");
    let amount = config.subscription.amount;
    if (dbAmountStr) {
      const cleaned = dbAmountStr.replace(/[^0-9.]/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) amount = parsed;
    }

    return {
      bankName: configMap.get("bank_name") || config.subscription.bankName,
      accountNumber: configMap.get("account_number") || config.subscription.accountNumber,
      accountName: configMap.get("account_name") || config.subscription.accountName,
      amount,
    };
  } catch (error) {
    console.error("Failed to load platform configuration from DB, using defaults", error);
    return {
      bankName: config.subscription.bankName,
      accountNumber: config.subscription.accountNumber,
      accountName: config.subscription.accountName,
      amount: config.subscription.amount,
    };
  }
}
