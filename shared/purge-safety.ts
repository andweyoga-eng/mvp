/**
 * Guard B for QA fixture purge (SPEC-SESSIONS-01 §8.3–8.4).
 * NODE_ENV=production always refuses.
 * Remote DATABASE_URL refuses unless I_UNDERSTAND_THIS_DELETES_DATA=1.
 */

export type PurgeEnv = {
  NODE_ENV?: string | undefined;
  DATABASE_URL?: string | undefined;
  DATABASE_PUBLIC_URL?: string | undefined;
  I_UNDERSTAND_THIS_DELETES_DATA?: string | undefined;
  [key: string]: string | undefined;
};

export function hasPurgeDestructiveOptIn(env: PurgeEnv = process.env as PurgeEnv): boolean {
  const v = env.I_UNDERSTAND_THIS_DELETES_DATA;
  return v === "1" || v === "true";
}

export function parseDatabaseHost(connectionString: string): string | null {
  const raw = connectionString.trim();
  if (!raw) return null;
  try {
    const withProto = /^[a-z]+:\/\//i.test(raw) ? raw : `postgres://${raw}`;
    const u = new URL(withProto);
    return u.hostname || null;
  } catch {
    return null;
  }
}

export function isLocalDatabaseHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h === "postgres" || // docker-compose service name
    h === "db"
  );
}

export function resolvePurgeDatabaseUrl(env: PurgeEnv = process.env as PurgeEnv): string {
  return (env.DATABASE_PUBLIC_URL?.trim() || env.DATABASE_URL?.trim() || "");
}

/**
 * Throws if purge must not run. Call at the start of purgeQaFixturesFromDb / purge-seed.
 */
export function assertPurgeAllowed(env: PurgeEnv = process.env as PurgeEnv): void {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "purge refused: NODE_ENV=production. QA fixture cleanup must never run against production.",
    );
  }

  const url = resolvePurgeDatabaseUrl(env);
  const host = parseDatabaseHost(url);
  if (url && !isLocalDatabaseHost(host) && !hasPurgeDestructiveOptIn(env)) {
    throw new Error(
      `purge refused: database host "${host ?? "(unknown)"}" is not local. ` +
        "Set I_UNDERSTAND_THIS_DELETES_DATA=1 to override, or SKIP_SEED_PURGE=1 to skip cleanup.",
    );
  }
}
