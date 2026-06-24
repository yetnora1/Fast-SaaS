import { handler, ok, fail } from "@/lib/api";
import { verifyWebhookSignature } from "@/lib/integrations/payments";
import { confirmPaymentByReference } from "@/lib/services/payments";

// CBE Birr payment webhook (demo-friendly, same shape as Telebirr).
// Payments are demo in this build; the cashier can also confirm from the POS via
// POST /api/cashier/payments/confirm-demo.
export const POST = handler(async (req: Request) => {
  const raw = await req.text();
  const sig = req.headers.get("x-cbe-signature");
  if (!verifyWebhookSignature(raw, sig, "CBE_WEBHOOK_SECRET")) return fail("Invalid signature", 401);

  const body = JSON.parse(raw || "{}");
  if (body.status && body.status !== "SUCCESS") return ok({ ignored: true });
  if (!body.reference) return fail("Missing reference", 422);

  const result = await confirmPaymentByReference(body.reference);
  return ok({ confirmed: !!result });
});
