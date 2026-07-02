import { prisma } from "./client";

/**
 * App-layer tenant isolation.
 *
 * This provides query-level multi-tenant safety by using a Prisma client extension.
 * Server code obtains a tenant-scoped client via `tenantDb(tenantId)`, which
 * returns a Prisma extension that AUTO-INJECTS `tenant_id` into every `where`/`create`
 * on tenant-owned models. This guarantees a query for tenant A can never read or write
 * tenant B's rows, acting as a robust fallback or replacement for database-level RLS.
 *
 * Models that carry tenant_id directly are listed in TENANT_MODELS. Models that
 * are tenant-owned only transitively (e.g. OrderItem via Order) must be accessed
 * through their parent or with explicit joins — never with a bare findMany.
 */

// Prisma model delegate keys that have a direct `tenantId` column.
const TENANT_MODELS = new Set([
  "tenant",
  "tenantFeature",
  "user",
  "invitation",
  "branch",
  "menuCategory",
  "order",
  "subscription",
  "inventoryItem",
  "supplier",
  "purchaseOrder",
  "restockRequest",
  "wasteLog",
  "auditLog",
]);

export type TenantClient = ReturnType<typeof tenantDb>;

export function tenantDb(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const key = model.charAt(0).toLowerCase() + model.slice(1);
          if (!TENANT_MODELS.has(key)) return query(args);

          const a = (args ?? {}) as Record<string, any>;

          // Reads & updates & deletes: force tenantId into the where clause.
          if (
            ["findMany", "findFirst", "findUnique", "count", "aggregate", "updateMany", "deleteMany", "update", "delete", "findFirstOrThrow", "findUniqueOrThrow"].includes(
              operation,
            )
          ) {
            a.where = { ...(a.where ?? {}), tenantId };
          }

          // Creates: stamp tenantId.
          if (operation === "create") {
            a.data = { ...(a.data ?? {}), tenantId };
          }
          if (operation === "createMany") {
            const data = a.data;
            a.data = Array.isArray(data)
              ? data.map((d: any) => ({ ...d, tenantId }))
              : { ...data, tenantId };
          }
          if (operation === "upsert") {
            a.where = { ...(a.where ?? {}), tenantId };
            a.create = { ...(a.create ?? {}), tenantId };
          }

          return query(a);
        },
      },
    },
  });
}
