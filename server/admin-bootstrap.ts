/** Admin bootstrap + credential helpers (testable without Express). */

export const LEGACY_ADMIN_PASSWORD = "admin123";

export interface AdminBootstrapConfig {
  password: string;
  email: string;
  name: string | null;
}

export function getAdminBootstrapConfig(): AdminBootstrapConfig | null {
  const password = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  if (!password || password.length < 8) return null;
  return {
    password,
    email: (process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase() || "admin@andweyoga.com"),
    name: process.env.ADMIN_INITIAL_NAME?.trim() || null,
  };
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeAdminPassword(password: string): string {
  return password.trim();
}
