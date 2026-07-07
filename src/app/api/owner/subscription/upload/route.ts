import { handler, ok, fail, clientIp } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { storeReceipt } from "@/lib/integrations/storage";
import { getDynamicPaymentConfig } from "@/lib/subscription";
import { audit } from "@/lib/audit";

// Receipt upload (multipart/form-data) → creates a PENDING subscription (spec §2.2).
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const form = await req.formData();
  const file = form.get("receipt");
  if (!(file instanceof File)) return fail("Receipt file required", 422);

  let url: string;
  try {
    ({ url } = await storeReceipt(file));
  } catch (e) {
    return fail((e as Error).message, 422);
  }

  const existingPending = await prisma.subscription.findFirst({ where: { tenantId: me.tenantId, status: "PENDING" } });
  if (existingPending) return fail("A receipt is already under review", 409);

  const paymentConfig = await getDynamicPaymentConfig();
  const sub = await prisma.subscription.create({
    data: { tenantId: me.tenantId, amount: paymentConfig.amount, receiptUrl: url, status: "PENDING" },
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "owner.subscription.upload", entity: "subscription", entityId: sub.id, ip: clientIp(req) });
  return ok({ subscriptionId: sub.id, status: "PENDING" });
});
