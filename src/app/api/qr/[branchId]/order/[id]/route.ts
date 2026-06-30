import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db/client";

// Public endpoint for customer to track their QR order status (Build spec §4.4)
export const GET = handler(async (_req: Request, { params }: { params: { branchId: string; id: string } }) => {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              name: true,
              nameAm: true,
            },
          },
        },
      },
      table: {
        select: {
          number: true,
        },
      },
    },
  });

  if (!order) {
    return fail("Order not found", 404);
  }

  if (order.branchId !== params.branchId) {
    return fail("Order does not belong to this branch", 400);
  }

  return ok({
    id: order.id,
    status: order.status,
    type: order.type,
    createdAt: order.createdAt,
    tableNumber: order.table?.number,
    feedbackRating: order.feedbackRating,
    feedbackComment: order.feedbackComment,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.menuItem.name,
      nameAm: item.menuItem.nameAm,
      quantity: item.quantity,
      status: item.status,
      notes: item.notes,
    })),
  });
});
