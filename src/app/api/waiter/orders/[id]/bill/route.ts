import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { requestBill } from "@/lib/services/orders";

export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireTenant("waiter", "cafe_manager", "cafe_owner");
  await requestBill(params.id);
  return ok({ billRequested: true });
});
