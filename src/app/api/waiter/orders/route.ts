import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { createOrder } from "@/lib/services/orders";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

const itemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  modifiers: z.array(z.object({ groupName: z.string(), option: z.string(), extraPrice: z.number().optional() })).optional(),
  notes: z.string().optional(),
  allergyNote: z.string().optional(),
});

const schema = z.object({
  tableId: z.string().optional(),
  type: z.enum(["DINE_IN", "QR", "TAKEAWAY"]).default("DINE_IN"),
  items: z.array(itemSchema).min(1),
  submit: z.boolean().default(true),
});

export const GET = handler(async () => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const orders = await prisma.order.findMany({
    where: { tenantId: me.tenantId, waiterId: me.sub, status: { notIn: ["COMPLETED", "VOIDED", "REFUNDED"] } },
    include: { items: { include: { menuItem: true } }, table: true },
    // declineReason is selected by default (it's a scalar field)
    orderBy: { createdAt: "desc" },
  });
  return ok({ orders });
});

export const POST = handler(async (req: Request) => {
  const me = await requireTenant("waiter", "cafe_manager", "cafe_owner");
  if (!me.branchId) return fail("Waiter has no branch", 400);
  const body = schema.parse(await req.json());
  const order = await createOrder({
    tenantId: me.tenantId,
    branchId: me.branchId,
    tableId: body.tableId,
    waiterId: me.sub,
    type: body.type,
    items: body.items,
    submit: body.submit,
  });
  await audit({ userId: me.sub, tenantId: me.tenantId, action: "waiter.order.create", entity: "order", entityId: order.id });
  return ok({ orderId: order.id, status: order.status });
});
