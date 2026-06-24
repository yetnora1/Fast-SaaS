import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { createOrder } from "@/lib/services/orders";

const schema = z.object({
  tableNumber: z.number().int().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        modifiers: z.array(z.object({ groupName: z.string(), option: z.string(), extraPrice: z.number().optional() })).optional(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});

// Public QR self-order — creates a DRAFT order that a waiter must confirm (spec §4.4).
export const POST = handler(async (req: Request, { params }: { params: { branchId: string } }) => {
  const branch = await prisma.branch.findUnique({ where: { id: params.branchId } });
  if (!branch) return fail("Branch not found", 404);
  const body = schema.parse(await req.json());

  let tableId: string | undefined;
  if (body.tableNumber) {
    const table = await prisma.cafeTable.findUnique({ where: { branchId_number: { branchId: branch.id, number: body.tableNumber } } });
    tableId = table?.id;
  }

  const order = await createOrder({
    tenantId: branch.tenantId,
    branchId: branch.id,
    tableId,
    type: "QR",
    items: body.items,
    submit: false, // stays DRAFT until waiter confirms
  });
  return ok({ orderId: order.id, status: order.status });
});
