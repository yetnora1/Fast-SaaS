import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { receiveGoods } from "@/lib/services/inventory";
import { toNum } from "@/lib/money";
import { audit } from "@/lib/audit";

// Station confirms receipt of goods issued by the store — permanent record of
// who received what, when (double-entry leg 2).
export const POST = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const me = await requireTenant("kitchen", "barista", "cafe_manager", "cafe_owner");
  try {
    const issue = await receiveGoods({ issueId: params.id, tenantId: me.tenantId, userId: me.sub });
    await audit({
      userId: me.sub,
      tenantId: me.tenantId,
      action: "kds.goods.receive",
      entity: "goods_issue",
      entityId: issue.id,
      meta: { item: issue.itemName, quantity: toNum(issue.quantity), unit: issue.unit },
    });
    return ok({ received: true, issue: { ...issue, quantity: toNum(issue.quantity) } });
  } catch (e) {
    return fail((e as Error).message, 409);
  }
});
