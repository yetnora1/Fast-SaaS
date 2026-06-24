import { handler, ok } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { setItemStatus } from "@/lib/services/orders";

export const PATCH = handler(async (_req: Request, { params }: { params: { id: string; itemId: string } }) => {
  await requireTenant("waiter", "cafe_manager", "cafe_owner");
  await setItemStatus(params.itemId, "DELIVERED");
  return ok({ delivered: true });
});
