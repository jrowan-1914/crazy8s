import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connString = process.env.DATABASE_URL_DIRECT;

  if (connString && connString.includes("digitalocean")) {
    // Production: parse URL and create pool with SSL
    const url = new URL(connString);
    const pool = new pg.Pool({
      host: url.hostname,
      port: parseInt(url.port),
      database: url.pathname.slice(1),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Local dev
  const adapter = new PrismaPg({
    connectionString:
      connString || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
