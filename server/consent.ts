import type { Request } from "express";
import { LEGAL_CONFIG } from "@shared/legal-config";
import {
  type ConsentAction,
  type ConsentCategoryStatus,
  type ConsentType,
  isAdult,
  isValidDateOfBirth,
} from "@shared/consent";

export { LEGAL_CONFIG, formatRegisteredOffice } from "@shared/legal-config";

export interface ConsentLogInput {
  userId?: string | null;
  bookingId?: string | null;
  consentType: ConsentType;
  action: ConsentAction;
  consentVersion?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function consentVersion(): string {
  return LEGAL_CONFIG.documentVersion;
}

export function requestMeta(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim() ?? null
      : req.socket.remoteAddress ?? null;
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;
  return { ipAddress: ip, userAgent };
}

export function validateOnboardingDateOfBirth(dateOfBirth: string): {
  ok: boolean;
  code?: "invalid_date" | "underage";
} {
  if (!isValidDateOfBirth(dateOfBirth)) {
    return { ok: false, code: "invalid_date" };
  }
  if (!isAdult(dateOfBirth)) {
    return { ok: false, code: "underage" };
  }
  return { ok: true };
}

export function buildConsentCategoryStatuses(
  rows: Array<{
    consentType: string;
    action: string;
    timestampUtc: Date | null;
    consentVersion: string;
  }>,
): ConsentCategoryStatus[] {
  const types: ConsentType[] = ["profile_booking", "terms", "age_declaration", "health_data"];
  return types.map((consentType) => {
    const relevant = rows
      .filter((r) => r.consentType === consentType)
      .sort((a, b) => {
        const ta = a.timestampUtc?.getTime() ?? 0;
        const tb = b.timestampUtc?.getTime() ?? 0;
        return tb - ta;
      });
    const latest = relevant[0];
    if (!latest) {
      return {
        consentType,
        status: "not_given" as const,
        lastAction: null,
        lastUpdated: null,
        consentVersion: null,
      };
    }
    const isActive = latest.action === "opt_in";
    return {
      consentType,
      status: isActive ? ("active" as const) : ("withdrawn" as const),
      lastAction: latest.action as ConsentAction,
      lastUpdated: latest.timestampUtc?.toISOString() ?? null,
      consentVersion: latest.consentVersion,
    };
  });
}

export const ERASURE_GRACE_DAYS = 30;

export function scheduledErasureDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + ERASURE_GRACE_DAYS);
  return d;
}
