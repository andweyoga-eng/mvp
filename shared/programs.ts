/** SPEC-SESSIONS-01 Program SKU helpers (A2). */

export const PROGRAM_KINDS = ["trial", "drop_in", "recurring"] as const;
export type ProgramKind = (typeof PROGRAM_KINDS)[number];

export const PROGRAM_STATUSES = ["draft", "active", "archived"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

/** Whole-program price in rupees → integer paise. Allows ₹0 for waived/admin cases. */
export function programRupeesToPaise(amount: string | number): number {
  const n = typeof amount === "string" ? Number(amount.trim()) : amount;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid program price");
  }
  return Math.round(n * 100);
}

export function programPaiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatProgramPaiseAsRupees(paise: number): string {
  return programPaiseToRupees(paise).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Soft UX check — never an invariant (SPEC 3.5 / FR-03). */
export function programPerSessionDivisibility(pricePaise: number, totalSessions: number): {
  dividesEvenly: boolean;
  perSessionPaise: number;
  perSessionRupeesLabel: string;
  warning: string | null;
} {
  const sessions = Math.max(1, totalSessions);
  const perSessionPaise = pricePaise / sessions;
  const dividesEvenly = pricePaise % sessions === 0;
  const label = programPaiseToRupees(perSessionPaise).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    dividesEvenly,
    perSessionPaise,
    perSessionRupeesLabel: label,
    warning: dividesEvenly
      ? null
      : `Price ₹${formatProgramPaiseAsRupees(pricePaise)} over ${sessions} sessions works out to ₹${label} per session (does not divide evenly). Saving is still allowed.`,
  };
}

export function computeProgramTotalSessions(
  sessionsPerWeek: number,
  durationWeeks: number,
): number {
  return Math.max(1, sessionsPerWeek) * Math.max(1, durationWeeks);
}

/**
 * A1.1 — contractual ₹/session from what was PAID (post-coupon), 8 decimal places.
 * Half-up to 8 dp (matches CA / Postgres ROUND). Stored as decimal string for NUMERIC(18,8).
 */
export function computePerSessionAllocationRupees(params: {
  totalPaidPaise: number;
  sessionsPurchased: number;
}): string {
  const sessions = Math.max(1, Math.floor(params.sessionsPurchased));
  const paidPaise = Math.max(0, Math.floor(params.totalPaidPaise));
  // allocation × 10^8 = (paise/100)/sessions × 10^8 = paise × 10^6 / sessions
  const numer = BigInt(paidPaise) * 1_000_000n;
  const denom = BigInt(sessions);
  const q = numer / denom;
  const r = numer % denom;
  const scaled = r * 2n >= denom ? q + 1n : q;
  const whole = scaled / 100_000_000n;
  const frac = scaled % 100_000_000n;
  return `${whole}.${frac.toString().padStart(8, "0")}`;
}

/** Round allocation × count to 2 dp rupees for posting/refund/display (CA rule). */
export function roundAllocationPostingRupees(
  perSessionAllocationRupees: string,
  sessionCount: number,
): string {
  const [w, f = ""] = perSessionAllocationRupees.split(".");
  const frac = (f + "00000000").slice(0, 8);
  const allocScaled = BigInt(w || "0") * 100_000_000n + BigInt(frac);
  const product = allocScaled * BigInt(Math.max(0, sessionCount));
  // product is in 1e-8 rupees; to 2 dp: divide by 1e6 with half-up
  const toTwoDp = 1_000_000n;
  const q = product / toTwoDp;
  const r = product % toTwoDp;
  const rounded = r * 2n >= toTwoDp ? q + 1n : q;
  const rupees = rounded / 100n;
  const paise = rounded % 100n;
  return `${rupees}.${paise.toString().padStart(2, "0")}`;
}

export function validateProgramShape(input: {
  kind: string;
  sessionsPerWeek: number;
  durationWeeks: number;
}): string | null {
  if (!PROGRAM_KINDS.includes(input.kind as ProgramKind)) {
    return "Kind must be trial, drop_in, or recurring";
  }
  if (!Number.isInteger(input.sessionsPerWeek) || input.sessionsPerWeek < 1) {
    return "Sessions per week must be a whole number ≥ 1";
  }
  if (!Number.isInteger(input.durationWeeks) || input.durationWeeks < 1) {
    return "Duration weeks must be a whole number ≥ 1";
  }
  if (
    (input.kind === "trial" || input.kind === "drop_in") &&
    (input.sessionsPerWeek !== 1 || input.durationWeeks !== 1)
  ) {
    return "Trial and drop-in programs must be 1 session per week for 1 week";
  }
  return null;
}
