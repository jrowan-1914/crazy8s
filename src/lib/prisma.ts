import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connString = process.env.DATABASE_URL_DIRECT;

  if (connString && connString.includes("digitalocean")) {
    // Production: parse URL and rebuild with SSL config for PrismaPg
    const url = new URL(connString);
    const adapter = new PrismaPg({
      host: url.hostname,
      port: parseInt(url.port),
      database: url.pathname.slice(1),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
    });
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
