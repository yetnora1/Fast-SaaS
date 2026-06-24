import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";

export const GET = handler(async (req: Request) => {
  await requireRole("saas_owner");
  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const skip = Number(url.searchParams.get("offset") ?? 0);
  const action = url.searchParams.get("action") ?? undefined;
  const tenantId = url.searchParams.get("tenantId") ?? undefined;

  const where = { ...(action ? { action } : {}), ...(tenantId ? { tenantId } : {}) };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.count({ where }),
  ]);
  return ok({ logs, total });
});
