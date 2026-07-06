import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { createOrder } from "@/lib/services/orders";
import { limitPublic } from "@/lib/rate-limit";

const schema = z.object({
  tableNumber: z.number().int().optional(),
  txRef: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
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
  // Public endpoint — cap fake-order floods: 5 orders per IP per 5 minutes.
  const limited = limitPublic(req, "qr-order", 5, 5 * 60_000);
  if (limited) return limited;
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
    txRef: body.txRef,
    receiptUrl: body.receiptUrl,
    guestTableNumber: body.tableNumber ?? null, // keep the number even if no CafeTable matches
  });
  return ok({ orderId: order.id, status: order.status });
});
