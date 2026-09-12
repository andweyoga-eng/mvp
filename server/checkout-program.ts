import type { Program } from "@shared/schema";
import {
  computeProgramHorizon,
  programHasFee,
  programPriceRupeesDisplay,
  sessionFrequencyToProgramKind,
  toPublicCheckoutProgram,
} from "@shared/checkout-program";
import { computePerSessionAllocationRupees } from "@shared/programs";

export {
  computeProgramHorizon,
  programHasFee,
  programPriceRupeesDisplay,
  sessionFrequencyToProgramKind,
  toPublicCheckoutProgram,
};

/** Frozen subscription contract fields from a Program (FR-16 + A1.1). */
export function subscriptionContractFromProgram(params: {
  program: Program;
  instructorId: string;
  startAt: Date;
  /** Post-coupon amount when known; otherwise program list price. */
  totalPaidPaise?: number;
}): {
  programId: string;
  instructorId: string;
  sessionsPurchased: number;
  totalPaidPaise: number;
  perSessionAllocation: string;
  horizonStartAt: Date;
  horizonEndAt: Date;
  sessionsConsumed: number;
  sessionsScheduled: number;
  sessionsUnscheduled: number;
  sessionsCredited: number;
  totalSessions: number;
  totalAmountPaise: number;
} {
  const { program, instructorId, startAt } = params;
  const { horizonStartAt, horizonEndAt } = computeProgramHorizon({
    startAt,
    durationWeeks: program.durationWeeks,
  });
  const totalPaidPaise =
    params.totalPaidPaise != null ? params.totalPaidPaise : program.pricePaise;
  const sessionsPurchased = program.totalSessions;
  return {
    programId: program.id,
    instructorId,
    sessionsPurchased,
    totalPaidPaise,
    perSessionAllocation: computePerSessionAllocationRupees({
      totalPaidPaise,
      sessionsPurchased,
    }),
    horizonStartAt,
    horizonEndAt,
    // Until Part B ledger materialises, treat purchased sessions as scheduled.
    sessionsConsumed: 0,
    sessionsScheduled: sessionsPurchased,
    sessionsUnscheduled: 0,
    sessionsCredited: 0,
    // Legacy mirrors (deprecated after A3; still written for old readers).
    totalSessions: sessionsPurchased,
    totalAmountPaise: totalPaidPaise,
  };
}

export function missingProgramResponse(result: {
  message: string;
  code: string;
}) {
  return {
    message: result.message,
    code: result.code,
  };
}
