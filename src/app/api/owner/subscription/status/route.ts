import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { checkSubscriptionStatus, getDynamicPaymentConfig } from "@/lib/subscription";
import { prisma } from "@/lib/db/client";

export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const status = await checkSubscriptionStatus(me.tenantId);
  const latest = await prisma.subscription.findFirst({ where: { tenantId: me.tenantId }, orderBy: { createdAt: "desc" } });
  const paymentConfig = await getDynamicPaymentConfig();

  return ok({
    status,
    latest,
    bank: { name: paymentConfig.bankName, accountNumber: paymentConfig.accountNumber, accountName: paymentConfig.accountName },
    amount: paymentConfig.amount,
    periodMonths: 6,
  });
});
