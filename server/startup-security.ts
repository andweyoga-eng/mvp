export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const required = ["JWT_SECRET"];
  const missing = required.filter((key) => !env[key]?.trim());

  if (!env.DATABASE_URL?.trim() && !env.DATABASE_PUBLIC_URL?.trim()) {
    missing.push("DATABASE_URL or DATABASE_PUBLIC_URL");
  }

  if (env.NODE_ENV === "production" && !env.ALLOWED_ORIGIN?.trim()) {
    missing.push("ALLOWED_ORIGIN");
  }

  if (missing.length > 0) {
    console.error("\n⛔ FATAL: Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\nCreate a .env file or set these in your hosting platform.\n");
    process.exit(1);
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    console.error("\n⛔ FATAL: JWT_SECRET is too short. Must be at least 32 characters.\n");
    process.exit(1);
  }
}

export function getAllowedCorsOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const host = env.ALLOWED_ORIGIN?.trim();
  if (!host) {
    if (env.NODE_ENV === "production") {
      throw new Error("ALLOWED_ORIGIN must be set in production.");
    }
    return "http://localhost:3000";
  }

  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const protocol = env.NODE_ENV !== "production" && isLocalHost ? "http" : "https";
  return `${protocol}://${host}`;
}
