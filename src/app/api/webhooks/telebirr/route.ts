import { handler, ok, fail } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/integrations/payments";
import { confirmPaymentByReference } from "@/lib/services/payments";

/**
 * Telebirr payment webhook. Payments are demo in this build, so the signature
 * check passes and you can simulate a customer paying with:
 *   POST /api/webhooks/telebirr  { "reference": "TB-XXXXXX-...", "status": "SUCCESS" }
 * The cashier can also confirm directly from the POS via
 *   POST /api/cashier/payments/confirm-demo.
 */
export const POST = handler(async (req: Request) => {
  const raw = await req.text();
  const sig = req.headers.get("x-telebirr-signature");
  if (!verifyWebhookSignature(raw, sig, "TELEBIRR_PUBLIC_KEY")) return fail("Invalid signature", 401);

  const body = JSON.parse(raw || "{}");
  if (body.status && body.status !== "SUCCESS") return ok({ ignored: true });
  if (!body.reference) return fail("Missing reference", 422);

  const result = await confirmPaymentByReference(body.reference);
  return ok({ confirmed: !!result });
});
