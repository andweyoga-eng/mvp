import type { Request } from "express";

/**
 * Dev-only bypass for scripted QA (e.g. qa:smoke-a01-e01) against fixture rows.
 * Set QA_INTERNAL_API_TOKEN in .env and send header X-AWY-QA-Internal with the same value.
 * Never enabled in production.
 */
export function isQaInternalApiRequest(req: Pick<Request, "get">): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const token = process.env.QA_INTERNAL_API_TOKEN?.trim();
  if (!token) return false;
  return req.get("x-awy-qa-internal") === token;
}
