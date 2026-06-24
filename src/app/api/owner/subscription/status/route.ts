import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { checkSubscriptionStatus } from "@/lib/subscription";
import { prisma } from "@/lib/db/client";
import { config } from "@/lib/config";

export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const status = await checkSubscriptionStatus(me.tenantId);
  const latest = await prisma.subscription.findFirst({ where: { tenantId: me.tenantId }, orderBy: { createdAt: "desc" } });
  return ok({
    status,
    latest,
    bank: { name: config.subscription.bankName, accountNumber: config.subscription.accountNumber, accountName: config.subscription.accountName },
    amount: config.subscription.amount,
    periodMonths: 6,
  });
});
