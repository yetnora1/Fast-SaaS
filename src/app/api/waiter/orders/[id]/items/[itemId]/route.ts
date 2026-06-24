import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

// Remove item — allowed only before preparation starts (spec §4.3).
export const DELETE = handler(async (_req: Request, { params }: { params: { id: string; itemId: string } }) => {
  await requireTenant("waiter", "cafe_manager", "cafe_owner");
  const item = await prisma.orderItem.findUnique({ where: { id: params.itemId } });
  if (!item) return fail("Not found", 404);
  if (item.status !== "NEW") return fail("Cannot remove — preparation already started (requires manager)", 409);
  await prisma.orderItem.delete({ where: { id: params.itemId } });
  return ok({ removed: true });
});
