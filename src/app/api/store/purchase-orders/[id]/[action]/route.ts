import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { receiveStock } from "@/lib/services/inventory";
import { audit } from "@/lib/audit";

// PO actions: approve | receive
export const PATCH = handler(async (_req: Request, { params }: { params: { id: string; action: string } }) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const po = await prisma.purchaseOrder.findFirst({ where: { id: params.id, tenantId: me.tenantId }, include: { items: true } });
  if (!po) return fail("PO not found", 404);

  if (params.action === "approve") {
    if (!["cafe_owner", "cafe_manager"].includes(me.role)) return fail("Only Manager/Owner can approve", 403);
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: "APPROVED", approvedBy: me.sub } });
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "store.po.approve", entity: "purchase_order", entityId: po.id });
    return ok({ approved: true });
  }

  if (params.action === "receive") {
    for (const line of po.items) {
      await receiveStock({ itemId: line.inventoryItemId, quantity: Number(line.quantity), reason: `PO ${po.id}`, userId: me.sub });
    }
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: "RECEIVED" } });
    await audit({ userId: me.sub, tenantId: me.tenantId, action: "store.po.receive", entity: "purchase_order", entityId: po.id });
    return ok({ received: true });
  }

  return fail("Unknown action", 400);
});
