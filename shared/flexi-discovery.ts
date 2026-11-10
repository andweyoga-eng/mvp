import {
  flexiOptionsMatchFixedSlots,
  isFlexiEnabledSchedule,
  type FlexiEligibleScheduleLike,
  type FlexiOptionSlotLike,
} from "./flexi-mode";

/**
 * Lightweight, discovery-oriented summary of a schedule's Flexi standing.
 *
 * This intentionally carries NO full option payload — it is the contract a
 * future search/filter/sort surface consumes to answer "does this session have
 * flexi swaps?" and "how flexible is it?" without pulling the heavy options
 * endpoint per row. See docs/FLEXI-DISCOVERY-ARCHITECTURE.md.
 */
export interface FlexiEligibilitySummary {
  anchorClassId: string;
  /** Client-derivable from flexiEnabled + recurrenceKind + seriesId. */
  eligible: boolean;
  /** True when Flexi offers real alternatives beyond the fixed anchor slots. */
  hasMeaningfulSwaps: boolean;
  optionCount: number;
  availableOptionCount: number;
  /** Higher = more flexible. Drives the future "most flexible" sort. */
  flexibilityScore: number;
}

export interface FlexiOptionCapacityLike extends FlexiOptionSlotLike {
  capacityAvailable?: boolean;
}

/** Guardrail so a large search result set can't request unbounded batches. */
export const FLEXI_ELIGIBILITY_BATCH_MAX = 50;

/** Client-side, zero-network eligibility check for badges in lists. */
export function isFlexiEligibleSchedule(
  schedule: FlexiEligibleScheduleLike | null | undefined,
): boolean {
  return isFlexiEnabledSchedule(schedule);
}

export function summarizeFlexiOptions(params: {
  anchorClassId: string;
  selectionCount: number;
  options: FlexiOptionCapacityLike[];
  fixedWeekdays?: number[];
  fixedTimeLabel?: string;
}): FlexiEligibilitySummary {
  const {
    anchorClassId,
    selectionCount,
    options,
    fixedWeekdays = [],
    fixedTimeLabel = "",
  } = params;
  const optionCount = options.length;
  const availableOptionCount = options.filter((o) => o.capacityAvailable !== false).length;
  const hasMeaningfulSwaps =
    optionCount > 0 &&
    !flexiOptionsMatchFixedSlots(fixedWeekdays, fixedTimeLabel, selectionCount, options);

  return {
    anchorClassId,
    eligible: true,
    hasMeaningfulSwaps,
    optionCount,
    availableOptionCount,
    flexibilityScore: hasMeaningfulSwaps ? availableOptionCount : 0,
  };
}

export function emptyFlexiEligibilitySummary(anchorClassId: string): FlexiEligibilitySummary {
  return {
    anchorClassId,
    eligible: false,
    hasMeaningfulSwaps: false,
    optionCount: 0,
    availableOptionCount: 0,
    flexibilityScore: 0,
  };
}

/** Sort comparator for "most flexible first". */
export function compareFlexiFlexibility(
  a: FlexiEligibilitySummary,
  b: FlexiEligibilitySummary,
): number {
  if (a.flexibilityScore !== b.flexibilityScore) {
    return b.flexibilityScore - a.flexibilityScore;
  }
  return b.optionCount - a.optionCount;
}
