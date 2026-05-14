import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const dbUrl =
  process.env.DATABASE_PUBLIC_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL or DATABASE_PUBLIC_URL must be set (database provisioned)"
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
