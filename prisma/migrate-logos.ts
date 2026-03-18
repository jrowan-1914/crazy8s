import fs from "fs";
import path from "path";
import pg from "pg";

const prodUrl = new URL(process.env.PROD_DB_URL!);
const pool = new pg.Pool({
  host: prodUrl.hostname,
  port: parseInt(prodUrl.port),
  database: prodUrl.pathname.slice(1),
  user: prodUrl.username,
  password: decodeURIComponent(prodUrl.password),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const logosDir = path.join(process.cwd(), "public", "logos");
  const files = fs.readdirSync(logosDir).filter((f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".webp"));

  console.log(`Found ${files.length} logo files.`);

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    // Team ID is the filename without extension
    const teamId = file.replace(/\.[^.]+$/, "");
    const filePath = path.join(logosDir, file);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    const ext = path.extname(file).slice(1);
    const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Check if team exists in production
    const result = await pool.query('SELECT id FROM "Team" WHERE id = $1', [teamId]);
    if (result.rows.length === 0) {
      console.log(`  Skipped ${file} — team ID not found in production`);
      skipped++;
      continue;
    }

    await pool.query('UPDATE "Team" SET "logoUrl" = $1, "updatedAt" = NOW() WHERE id = $2', [dataUrl, teamId]);
    updated++;
    if (updated % 10 === 0) console.log(`  ...${updated} logos uploaded`);
  }

  console.log(`\nDone! ${updated} logos uploaded, ${skipped} skipped.`);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
