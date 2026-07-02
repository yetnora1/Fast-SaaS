/** Centralised env access with sane defaults so the app boots in dev. */

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function requiredSecret(): string {
  const v = process.env.AUTH_SECRET;
  if (v && v.length >= 32) return v;
  // Never sign/verify production sessions with a guessable key. Checked lazily
  // (on first use, not import) so `next build` works without runtime secrets.
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set (>= 32 chars) in production");
  }
  return "dev-insecure-secret-change-me-please-32";
}

export const config = {
  get authSecret() {
    return requiredSecret();
  },
  authUrl: process.env.AUTH_URL ?? "http://localhost:3000",
  // Staff log in on shared POS tablets — keep sessions short (12h default).
  sessionTtlHours: num(process.env.SESSION_TTL_HOURS, 12),

  subscription: {
    amount: num(process.env.SAAS_SUBSCRIPTION_AMOUNT, 30000),
    days: num(process.env.SAAS_SUBSCRIPTION_DAYS, 180),
    trialDays: num(process.env.SAAS_TRIAL_DAYS, 7),
    graceDays: num(process.env.SAAS_GRACE_PERIOD_DAYS, 3),
    warningDays: num(process.env.SAAS_WARNING_DAYS, 7),
    bankName: process.env.SAAS_BANK_NAME ?? "Commercial Bank of Ethiopia",
    accountNumber: process.env.SAAS_ACCOUNT_NUMBER ?? "1000XXXXXXXXX",
    accountName: process.env.SAAS_ACCOUNT_NAME ?? "CafeFlow Technologies",
  },

  vatRate: num(process.env.VAT_RATE, 0.15),

  receiptStorageDir: process.env.RECEIPT_STORAGE_DIR ?? "./.uploads",

  poApprovalThreshold: num(process.env.PO_APPROVAL_THRESHOLD, 5000),
};

export const COOKIE_NAME = "cafeflow_session";
