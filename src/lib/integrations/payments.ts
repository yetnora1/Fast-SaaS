import { createHmac, timingSafeEqual } from "crypto";

/**
 * Payment adapters — DEMO MODE.
 *
 * All payment methods (Cash, Telebirr, CBE Birr) are simulated. There is NO real
 * provider integration: `init*` returns a synthetic reference, and the payment is
 * confirmed via the webhook endpoints, which can be called directly to simulate
 * the customer paying. Swap in real provider SDKs (e.g. Chapa) when going live —
 * webhook signatures ARE enforced whenever the provider secret env is set.
 */

export interface PaymentInit {
  reference: string;
  deepLink?: string;
  qr?: string;
  /** Always true in this build — payments are demo/simulated. */
  demo: boolean;
}

export async function initTelebirr(opts: { amount: number; phone: string; orderId: string }): Promise<PaymentInit> {
  const reference = `TB-${opts.orderId.slice(-6)}-${Date.now().toString(36)}`.toUpperCase();
  return { reference, deepLink: `telebirr://pay?ref=${reference}`, qr: reference, demo: true };
}

export async function initCbeBirr(opts: { amount: number; orderId: string }): Promise<PaymentInit> {
  const reference = `CBE-${opts.orderId.slice(-6)}-${Date.now().toString(36)}`.toUpperCase();
  return { reference, demo: true };
}

/**
 * Webhook signature verification (HMAC-SHA256 over the raw body).
 *
 * - Secret set (env named by `secretEnv`): the signature header must match.
 * - No secret + production: reject — never accept unsigned payment webhooks live.
 * - No secret + dev/preview: accept, so demo payments can be simulated locally.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secretEnv: string): boolean {
  const secret = process.env[secretEnv];
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
