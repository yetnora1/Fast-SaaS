import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

// Public customer endpoint to submit feedback on their completed order.
export const POST = handler(async (req: Request, { params }: { params: { branchId: string; id: string } }) => {
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return fail("Order not found", 404);
  if (order.branchId !== params.branchId) return fail("Order does not belong to this branch", 400);

  const body = schema.parse(await req.json());

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      feedbackRating: body.rating,
      feedbackComment: body.comment || null,
    },
  });

  return ok({ success: true, orderId: updated.id });
});
