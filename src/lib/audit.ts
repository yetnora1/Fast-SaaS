import { prisma } from "@/lib/db/client";

/** Append-only audit log (Section 13 security requirement: who/what/when/where). */
export async function audit(opts: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: opts.tenantId ?? null,
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        metaJson: (opts.meta ?? undefined) as any,
        ip: opts.ip ?? null,
      },
    });
  } catch (e) {
    // Audit must never break the request path.
    console.error("[audit] failed", e);
  }
}
