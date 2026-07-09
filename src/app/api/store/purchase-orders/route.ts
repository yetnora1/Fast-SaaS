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
  isCredit: z.boolean().optional(),
  paidAmount: z.number().nonnegative().optional(),
  creditAmount: z.number().nonnegative().optional(),
  items: z.array(z.object({ 
    inventoryItemId: z.string().min(1), 
    quantity: z.number().positive(), 
    unitCost: z.number().nonnegative() 
  })).min(1),
});

// PO above approval threshold needs Owner approval. Auto-approved if created by Owner.
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  const total = body.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  
  let status: "APPROVED" | "PENDING_APPROVAL" = "APPROVED";
  if (total > config.poApprovalThreshold && me.role !== "cafe_owner") {
    status = "PENDING_APPROVAL";
  }

  const isCredit = body.isCredit ?? false;
  const paidAmount = body.paidAmount !== undefined ? body.paidAmount : (isCredit ? total / 2 : total);
  const creditAmount = body.creditAmount !== undefined ? body.creditAmount : (isCredit ? total - paidAmount : 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId: me.tenantId,
      supplierId: body.supplierId,
      notes: body.notes,
      total,
      paidAmount,
      creditAmount,
      isCredit,
      status,
      items: { create: body.items },
    },
    include: { items: true },
  });
  return ok({ po, requiresApproval: status === "PENDING_APPROVAL" });
});
