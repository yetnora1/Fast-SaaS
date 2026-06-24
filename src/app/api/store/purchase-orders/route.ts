import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { tenantDb } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/client";
import { config } from "@/lib/config";

export const GET = handler(async () => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const pos = await tenantDb(me.tenantId).purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { name: true } }, items: true },
  });
  return ok({ purchaseOrders: pos });
});

const schema = z.object({
  supplierId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({ inventoryItemId: z.string().min(1), quantity: z.number().positive(), unitCost: z.number().nonnegative() })).min(1),
});

// PO above approval threshold needs Owner approval (spec §8.2).
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const total = body.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const status = total > config.poApprovalThreshold ? "PENDING_APPROVAL" : "APPROVED";

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: me.tenantId,
      supplierId: body.supplierId,
      notes: body.notes,
      total,
      status,
      items: { create: body.items },
    },
    include: { items: true },
  });
  return ok({ po, requiresApproval: status === "PENDING_APPROVAL" });
});
