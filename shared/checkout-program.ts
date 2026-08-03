/**
 * SPEC-SESSIONS-01 A3 — resolve the Program SKU at checkout.
 * Never fall back to class_types.price for charging (FR-04).
 */
import type { Program } from "./schema";
import { formatProgramPaiseAsRupees, programPaiseToRupees } from "./programs";

export type CheckoutProgramKind = "trial" | "drop_in" | "recurring";

export function sessionFrequencyToProgramKind(
  sessionFrequency: string | null | undefined,
): CheckoutProgramKind | null {
  if (sessionFrequency === "trial") return "trial";
  if (sessionFrequency === "drop_in") return "drop_in";
  if (sessionFrequency === "recurring") return "recurring";
  return null;
}

/** Guests may only purchase trial or drop_in Programs (SPEC §7.3). */
export function guestMayPurchaseProgramKind(kind: string): boolean {
  return kind === "trial" || kind === "drop_in";
}

export function programHasFee(program: Pick<Program, "pricePaise">): boolean {
  return Number(program.pricePaise) > 0;
}

export function programPriceRupeesDisplay(program: Pick<Program, "pricePaise">): string {
  return programPaiseToRupees(program.pricePaise).toFixed(2);
}

export function formatProgramCheckoutLabel(program: {
  kind: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  totalSessions: number;
  pricePaise: number;
}): string {
  if (program.kind === "trial" || program.kind === "drop_in") {
    return `${program.kind.replace("_", "-")} · ₹${formatProgramPaiseAsRupees(program.pricePaise)}`;
  }
  return (
    `${program.sessionsPerWeek}/week × ${program.durationWeeks} weeks` +
    ` (${program.totalSessions} sessions) · ₹${formatProgramPaiseAsRupees(program.pricePaise)}`
  );
}

export function computeProgramHorizon(params: {
  startAt: Date;
  durationWeeks: number;
}): { horizonStartAt: Date; horizonEndAt: Date } {
  const horizonStartAt = new Date(params.startAt);
  const horizonEndAt = new Date(params.startAt);
  horizonEndAt.setDate(horizonEndAt.getDate() + Math.max(1, params.durationWeeks) * 7 - 1);
  horizonEndAt.setHours(23, 59, 59, 999);
  return { horizonStartAt, horizonEndAt };
}

export type PublicCheckoutProgram = {
  id: string;
  classTypeId: string;
  kind: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  totalSessions: number;
  pricePaise: number;
  priceRupees: string;
  label: string;
  flexiAllowed: boolean;
  version: number;
};

export function toPublicCheckoutProgram(program: Program): PublicCheckoutProgram {
  return {
    id: program.id,
    classTypeId: program.classTypeId,
    kind: program.kind,
    sessionsPerWeek: program.sessionsPerWeek,
    durationWeeks: program.durationWeeks,
    totalSessions: program.totalSessions,
    pricePaise: program.pricePaise,
    priceRupees: programPriceRupeesDisplay(program),
    label: formatProgramCheckoutLabel(program),
    flexiAllowed: program.flexiAllowed,
    version: program.version,
  };
}
