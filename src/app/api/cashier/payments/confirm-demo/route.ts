import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { confirmPaymentByReference } from "@/lib/services/payments";

const schema = z.object({ reference: z.string().min(1) });

/**
 * Demo-confirm a pending digital payment (Telebirr / CBE Birr).
 *
 * Payments are demo/simulated in this build, so there is no real provider
 * webhook to confirm them. This lets the cashier mark a PENDING digital payment
 * as paid from the POS — the same effect the provider webhook would have.
 */
export const POST = handler(async (req: Request) => {
  await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const { reference } = schema.parse(await req.json());

  const result = await confirmPaymentByReference(reference);
  if (!result) return fail("No pending payment found for that reference", 404);

  return ok({ confirmed: true, orderId: result.order.id });
});
