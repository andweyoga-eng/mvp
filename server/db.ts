import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

/**
 * Railway (and similar) often set DATABASE_URL to a private *.railway.internal host.
 * That only resolves inside Railway's private network; some app deployments still get
 * ENOTFOUND for that hostname. DATABASE_PUBLIC_URL is the TCP proxy URL and resolves
 * reliably from the app container. Prefer it when set (Railway Postgres exposes both).
 */
function getDatabaseConnectionString(): string {
  const pub = process.env.DATABASE_PUBLIC_URL?.trim();
  const internal = process.env.DATABASE_URL?.trim();
  const url = pub || internal;
  if (!url) {
    throw new Error(
      'DATABASE_URL or DATABASE_PUBLIC_URL must be set. Did you forget to provision a database?'
    );
  }
  return url;
}

/** Hosted Postgres (Railway, etc.) requires SSL even from localhost. */
function resolvePoolSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }
  try {
    const host = new URL(connectionString).hostname.toLowerCase();
    const remote =
      host.endsWith(".rlwy.net") ||
      host.includes("railway") ||
      host.includes("amazonaws.com") ||
      host.includes("supabase.co");
    return remote ? { rejectUnauthorized: false } : false;
  } catch {
    return false;
  }
}

const connectionString = getDatabaseConnectionString();

export const pool = new Pool({
  connectionString,
  ssl: resolvePoolSsl(connectionString),
});

export const db = drizzle(pool, { schema });
