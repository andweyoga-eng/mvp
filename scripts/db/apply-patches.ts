/**
 * Apply idempotent SQL patches when `drizzle-kit push` fails (e.g. 42P16 on primary keys).
 *
 * Usage: npm run db:patch
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const patchesDir = path.join(__dirname, "patches");

async function main() {
  const connectionString =
    process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    console.error("Set DATABASE_URL or DATABASE_PUBLIC_URL in .env");
    process.exit(1);
  }

  const files = fs
    .readdirSync(patchesDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No patches found.");
    return;
  }

  const pool = new pg.Pool({ connectionString });

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(patchesDir, file), "utf8");
      console.log(`\n▶ Applying ${file}...`);
      await pool.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log("\n✅ All patches applied.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
