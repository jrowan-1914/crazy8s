import { defineConfig } from "prisma/config";

// Try dotenv for local dev, ignore if .env doesn't exist
try { require("dotenv/config"); } catch {}

const databaseUrl = process.env["DATABASE_URL_DIRECT"] || process.env["DATABASE_URL"];

if (!databaseUrl) {
  console.warn("WARNING: No DATABASE_URL_DIRECT or DATABASE_URL found in environment");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl!,
  },
});
