/**
 * Payment adapters — DEMO MODE.
 *
 * All payment methods (Cash, Telebirr, CBE Birr) are simulated. There is NO real
 * provider integration: `init*` returns a synthetic reference, and the payment is
 * confirmed via the webhook endpoints, which can be called directly to simulate
 * the customer paying. Everything is persisted to MySQL. This is intentional for
 * the current build — swap in real provider SDKs later if/when going live.
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
 * Webhook signature verification.
 * In demo mode there is no shared secret, so this always accepts — the webhook
 * endpoints are the simulation hook used to mark a demo payment as paid.
 */
export function verifyWebhookSignature(_rawBody: string, _signature: string | null, _secretEnv: string): boolean {
  return true;
}
