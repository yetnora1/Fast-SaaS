import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db/client";

// Public customer-facing menu for QR self-ordering (no auth).
//
// This is the hottest public endpoint and customers hit it from slow mobile
// networks, so it is CDN-cached at the edge: fresh for 60s, then served stale
// while revalidating in the background. Menu edits appear within ~a minute.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
};

// Always read fresh from the DB at the origin — the CDN header above is what
// caches at the edge. Without this Next could freeze the route's first response.
export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, { params }: { params: { branchId: string } }) => {
  const branch = await prisma.branch.findUnique({
    where: { id: params.branchId },
    select: { id: true, name: true, tenantId: true },
  });
  if (!branch) return ok({ categories: [] }, { headers: CACHE_HEADERS });
  const categories = await prisma.menuCategory.findMany({
    where: { tenantId: branch.tenantId, active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      nameAm: true,
      items: {
        where: { state: "PUBLISHED", available: true },
        // Only what the QR page renders — keeps the payload small on slow networks.
        select: {
          id: true,
          categoryId: true,
          name: true,
          nameAm: true,
          description: true,
          price: true,
          imageUrl: true,
          course: true,
          modifiers: { select: { id: true, itemId: true, groupName: true, option: true, extraPrice: true } },
        },
      },
    },
  });
  return ok({ branch, categories }, { headers: CACHE_HEADERS });
});
