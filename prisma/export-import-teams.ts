import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Local Prisma client
const localAdapter = new PrismaPg({
  connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
});
const localPrisma = new PrismaClient({ adapter: localAdapter });

// Production: raw pg pool
const prodUrl = new URL(process.env.PROD_DB_URL!);
const prodPool = new pg.Pool({
  host: prodUrl.hostname,
  port: parseInt(prodUrl.port),
  database: prodUrl.pathname.slice(1),
  user: prodUrl.username,
  password: decodeURIComponent(prodUrl.password),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Fetching teams from local database...");
  const teams = await localPrisma.team.findMany({
    orderBy: [{ region: "asc" }, { seed: "asc" }],
  });
  console.log(`Found ${teams.length} teams locally.`);

  // Verify prod connection
  const dbCheck = await prodPool.query("SELECT current_database()");
  console.log(`Connected to production database: ${dbCheck.rows[0].current_database}`);

  console.log("Inserting teams into production database...");
  let count = 0;
  for (const team of teams) {
    await prodPool.query(
      `INSERT INTO "Team" (id, name, seed, region, "logoUrl", eliminated, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (region, seed) DO UPDATE SET
         name = EXCLUDED.name,
         "logoUrl" = EXCLUDED."logoUrl",
         eliminated = EXCLUDED.eliminated,
         "updatedAt" = NOW()`,
      [team.id, team.name, team.seed, team.region, team.logoUrl, false]
    );
    count++;
    if (count % 16 === 0) console.log(`  ...${count}/${teams.length}`);
  }

  console.log(`Done! ${count} teams synced to production.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await prodPool.end();
  });
