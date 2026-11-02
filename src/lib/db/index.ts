import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// In production each Next.js worker shares one Prisma client.
// connection_limit bounds the PostgreSQL connection pool to avoid
// exhausting max_connections (100 default on Render free tier).
// Set via DATABASE_URL ?connection_limit=5 or the env var below.
const CONNECTION_LIMIT = parseInt(process.env.DB_CONNECTION_LIMIT ?? "5", 10);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL?.includes("connection_limit")
            ? process.env.DATABASE_URL
            : `${process.env.DATABASE_URL ?? ""}${process.env.DATABASE_URL?.includes("?") ? "&" : "?"}connection_limit=${CONNECTION_LIMIT}&pool_timeout=10`,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
