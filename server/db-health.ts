import { pool } from "./db";

export type DatabaseHealthResult =
  | { ok: true }
  | { ok: false; error: string };

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
