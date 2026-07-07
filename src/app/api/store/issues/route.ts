import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { issueGoods } from "@/lib/services/inventory";
import { toNum } from "@/lib/money";
import { audit } from "@/lib/audit";

function serialize(i: any) {
  return { ...i, quantity: toNum(i.quantity) };
}

// Permanent store→station goods ledger (issues + receipts), newest first.
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;

  const issues = await prisma.goodsIssue.findMany({
    where: {
      tenantId: me.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(status === "ISSUED" || status === "RECEIVED" ? { status } : {}),
    },
    include: { issuedBy: { select: { name: true } }, receivedBy: { select: { name: true } } },
    orderBy: { issuedAt: "desc" },
    take: 300,
  });
  return ok({ issues: issues.map(serialize) });
});

const schema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  destination: z.enum(["KITCHEN", "BARISTA"]),
  note: z.string().max(300).optional(),
});

// Issue goods from the store to a station — decrements stock and writes the
// permanent double-entry ledger row (TRANSFER movement + GoodsIssue).
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("store_manager", "cafe_manager", "cafe_owner");
  const body = schema.parse(await req.json());
  try {
    const issue = await issueGoods({ tenantId: me.tenantId, userId: me.sub, ...body });
    await audit({
      userId: me.sub,
      tenantId: me.tenantId,
      action: "store.goods.issue",
      entity: "goods_issue",
      entityId: issue.id,
      meta: { item: issue.itemName, quantity: body.quantity, unit: issue.unit, destination: body.destination },
    });
    return ok({ issue: serialize(issue) });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
});
