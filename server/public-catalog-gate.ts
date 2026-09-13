import type { Request } from "express";
import { isPublicCatalogSession } from "@shared/seed-catalog";
import { isQaInternalApiRequest } from "./qa-internal-api";

/** Whether a session may be shown or booked via public member APIs. */
export function isSessionAllowedInPublicCatalog(
  classType: { name: string } | null | undefined,
  instructor: { name: string } | null | undefined,
  req?: Pick<Request, "get">,
): boolean {
  if (req && isQaInternalApiRequest(req)) return true;
  return isPublicCatalogSession(classType, instructor);
}
