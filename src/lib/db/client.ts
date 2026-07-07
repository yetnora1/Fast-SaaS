import { PrismaClient } from "@prisma/client";

// Single PrismaClient across hot-reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const dbUrl = process.env.DATABASE_URL;
const dynamicUrl = dbUrl && process.env.NODE_ENV === "production" && !dbUrl.includes("connection_limit")
  ? `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}connection_limit=1`
  : dbUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dynamicUrl ? { db: { url: dynamicUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
