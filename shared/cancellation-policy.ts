/**
 * Cancellation, Refund and Rescheduling Policy v2.0 (SPEC-SESSIONS-01 Part C).
 * Authority: signed policy + master FR-A18–A21 / FR-40+ / FR-60+.
 */

/** Exact version id stored on acceptance (never overwrite; archive by adding new constants). */
export const CANCELLATION_POLICY_VERSION = "cancellation-refund-v2.0";

/** Product-signed effective date (3 Aug 2026). */
export const CANCELLATION_POLICY_EFFECTIVE_DATE = "2026-08-03";

/** Consent audit `consent_type` for policy clickwrap (mirrors consent_audit_logs). */
export const CANCELLATION_POLICY_CONSENT_TYPE = "cancellation_refund" as const;

/** Policy cl.5: reschedule window = MAX(cancel + 30d, horizon_end). */
export const RESCHEDULE_WINDOW_DAYS = 30;

export const CANCELLATION_POLICY_PATH = "/cancellation-refund";

export type CancellationPolicyArchiveEntry = {
  version: string;
  effectiveDate: string;
  /** ISO date when superseded; null = current. */
  supersededAt: string | null;
  title: string;
};

/** Historic versions stay listed; never mutate prior entries (policy cl.14). */
export const CANCELLATION_POLICY_ARCHIVE: readonly CancellationPolicyArchiveEntry[] = [
  {
    version: CANCELLATION_POLICY_VERSION,
    effectiveDate: CANCELLATION_POLICY_EFFECTIVE_DATE,
    supersededAt: null,
    title: "Cancellation, Refund and Rescheduling Policy v2.0",
  },
] as const;

export function isCurrentCancellationPolicyVersion(version: string): boolean {
  return version.trim() === CANCELLATION_POLICY_VERSION;
}

/**
 * Deadline for rescheduling unscheduled entitlement after a platform/instructor cancel.
 * = MAX(cancelAt + 30 days, horizonEndAt) when horizon is set; else cancelAt + 30 days.
 */
export function computeRescheduleDeadline(params: {
  cancelAt: Date;
  horizonEndAt?: Date | null;
}): Date {
  const cancelPlus = new Date(params.cancelAt.getTime());
  cancelPlus.setUTCDate(cancelPlus.getUTCDate() + RESCHEDULE_WINDOW_DAYS);
  const horizon = params.horizonEndAt ? new Date(params.horizonEndAt.getTime()) : null;
  if (!horizon || Number.isNaN(horizon.getTime())) {
    return cancelPlus;
  }
  return cancelPlus.getTime() >= horizon.getTime() ? cancelPlus : horizon;
}

/** Rupee string (2 dp) → integer paise for gateway refunds. */
export function rupees2dpToPaise(rupees2dp: string): number {
  const [w, f = ""] = rupees2dp.replace(/,/g, "").split(".");
  const frac = (f + "00").slice(0, 2);
  return Number(BigInt(w || "0") * 100n + BigInt(frac));
}

export const CANCELLATION_POLICY_CLICKWRAP_COPY = {
  en: {
    checkboxLabel:
      "I have read and agree to the Cancellation, Refund and Rescheduling Policy.",
    linkLabel: "Cancellation, Refund and Rescheduling Policy",
    requiredError: "Please accept the Cancellation and Refund Policy to continue.",
  },
} as const;
