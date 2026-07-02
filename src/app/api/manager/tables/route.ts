import { handler, ok, fail } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

export const GET = handler(async (req: Request) => {
  const me = await requireRole("cafe_manager", "cafe_owner", "waiter");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId ?? undefined;
  const tables = await prisma.cafeTable.findMany({
    where: { branchId },
    orderBy: { number: "asc" },
    include: { orders: { where: { status: { notIn: ["COMPLETED", "VOIDED", "REFUNDED"] } }, select: { id: true, status: true, waiterId: true } } },
  });
  const branch = branchId
    ? await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true, tenant: { select: { name: true } } } })
    : null;
  return ok({ tables, cafeName: branch?.tenant.name ?? null, branchName: branch?.name ?? null });
});

// Add a new table to the floor (manager/owner). Number is auto-assigned;
// position is staggered so it doesn't land exactly on an existing table.
export const POST = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const body = await req.json().catch(() => ({}));
  const branchId = body.branchId ?? me.branchId ?? (await prisma.branch.findFirst({ where: { tenantId: me.tenantId }, select: { id: true } }))?.id;
  if (!branchId) return fail("No branch found for this tenant", 400);

  const last = await prisma.cafeTable.aggregate({ where: { branchId }, _max: { number: true } });
  const number = (last._max.number ?? 0) + 1;
  const table = await prisma.cafeTable.create({
    data: {
      branchId,
      number,
      capacity: 4,
      xPos: 120 + ((number * 37) % 260),
      yPos: 90 + ((number * 53) % 130),
    },
    include: { orders: { select: { id: true } } },
  });
  return ok({ table });
});
