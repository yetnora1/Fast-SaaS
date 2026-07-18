import { z } from "zod";
import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";

const printerSchema = z.object({
  type: z.enum(["browser", "network", "usb", "bluetooth"]),
  ip: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  vendorId: z.number().int().optional(),
  productId: z.number().int().optional(),
});

/**
 * GET – read current printer config for a branch
 * PATCH – update printer config (stored in branch.settingsJson.printer)
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? me.branchId;
  if (!branchId) return fail("No branch specified", 400);

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId: me.tenantId },
    select: { id: true, name: true, settingsJson: true },
  });
  if (!branch) return fail("Branch not found", 404);

  const settings = (branch.settingsJson ?? {}) as Record<string, unknown>;
  return ok({ branchId: branch.id, branchName: branch.name, printer: settings.printer ?? { type: "browser" } });
});

export const PATCH = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const body = z.object({
    branchId: z.string().min(1),
    printer: printerSchema,
  }).parse(await req.json());

  const branch = await prisma.branch.findFirst({
    where: { id: body.branchId, tenantId: me.tenantId },
  });
  if (!branch) return fail("Branch not found", 404);

  const existing = (branch.settingsJson ?? {}) as Record<string, unknown>;
  const updated = { ...existing, printer: body.printer };

  await prisma.branch.update({
    where: { id: body.branchId },
    data: { settingsJson: updated },
  });

  return ok({ printer: body.printer });
});
