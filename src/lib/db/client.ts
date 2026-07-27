import { PrismaClient } from "@prisma/client";

// Single PrismaClient across hot-reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Replace (not append) a query param, without re-encoding the credentials. */
function withParam(url: string, key: string, value: string) {
  const [base, query = ""] = url.split("?");
  const params = query.split("&").filter((p) => p && !p.startsWith(`${key}=`));
  params.push(`${key}=${value}`);
  return `${base}?${params.join("&")}`;
}

const dbUrl = process.env.DATABASE_URL;

// Serverless (Vercel) runs many short-lived instances against a 20-connection
// Postgres, so each instance must hold exactly one. A long-running dev server is
// the opposite case — it's one process, and a 1-connection pool serialises every
// query in the app behind the previous one (~171ms round trip each), which is
// what made dashboards take seconds. Force 1 in production; locally honour the
// pool size set in DATABASE_URL.
// NOTE: this now *overrides* an existing connection_limit rather than deferring
// to it, so a larger value configured for dev can never leak into production.
const dynamicUrl = dbUrl && process.env.NODE_ENV === "production"
  ? withParam(dbUrl, "connection_limit", "1")
  : dbUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dynamicUrl ? { db: { url: dynamicUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
