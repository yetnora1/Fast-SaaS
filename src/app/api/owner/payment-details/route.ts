import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

const SELECT = { cbeAccountName: true, cbeAccountNumber: true, telebirrNumber: true, telebirrQrUrl: true } as const;

// The cafe's own customer-facing payment accounts (shown on the QR payment screen).
export const GET = handler(async () => {
  const me = await requireTenant("cafe_owner");
  const t = await prisma.tenant.findUnique({ where: { id: me.tenantId }, select: SELECT });
  return ok(t ?? { cbeAccountName: null, cbeAccountNumber: null, telebirrNumber: null, telebirrQrUrl: null });
});

const schema = z.object({
  cbeAccountName: z.string().max(120).optional().nullable(),
  cbeAccountNumber: z.string().max(40).optional().nullable(),
  telebirrNumber: z.string().max(40).optional().nullable(),
  telebirrQrUrl: z.string().max(500).optional().nullable(),
});

export const PUT = handler(async (req: Request) => {
  const me = await requireTenant("cafe_owner");
  const body = schema.parse(await req.json());
  const clean = (v?: string | null) => {
    const s = v?.trim();
    return s ? s : null;
  };
  const t = await prisma.tenant.update({
    where: { id: me.tenantId },
    data: {
      cbeAccountName: clean(body.cbeAccountName),
      cbeAccountNumber: clean(body.cbeAccountNumber),
      telebirrNumber: clean(body.telebirrNumber),
      telebirrQrUrl: clean(body.telebirrQrUrl),
    },
    select: SELECT,
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "owner.payment_details.update", entity: "tenant", entityId: me.tenantId });
  return ok(t);
});
