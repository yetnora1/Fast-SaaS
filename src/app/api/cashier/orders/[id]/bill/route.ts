import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { getBill } from "@/lib/services/orders";
import { vatFromInclusive } from "@/lib/money";

export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireTenant("cashier", "cafe_manager", "cafe_owner");
  try {
    const { order, lines, total } = await getBill(params.id);
    const vat = vatFromInclusive(total);
    return ok({ orderId: order.id, table: order.table?.number, lines, ...vat });
  } catch (e) {
    return fail((e as Error).message, 404);
  }
});
