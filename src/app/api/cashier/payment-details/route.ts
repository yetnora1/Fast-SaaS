import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// The cafe's Telebirr receiving details, shown in the POS when the cashier
// selects Telebirr so the customer can scan the real QR and pay directly.
export const GET = handler(async () => {
  const me = await requireTenant("cashier", "cafe_manager", "cafe_owner");
  const t = await prisma.tenant.findUnique({
    where: { id: me.tenantId },
    select: { name: true, telebirrNumber: true, telebirrQrUrl: true },
  });
  return ok({
    businessName: t?.name ?? null,
    telebirrNumber: t?.telebirrNumber ?? null,
    telebirrQrUrl: t?.telebirrQrUrl ?? null,
  });
});
