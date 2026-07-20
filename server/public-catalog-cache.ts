import type { Response } from "express";

/** Prevent browsers from serving stale bookable-session JSON after admin pause/resume/delete. */
export function setPublicCatalogNoStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}
