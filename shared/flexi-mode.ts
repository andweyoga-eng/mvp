import type { Class, ClassType } from "./schema";
import { parseRecurrenceWeekdays } from "./session-schedule";
import { formatIstTime } from "./ist-datetime";

export interface FlexiEligibleScheduleLike {
  id: string;
  classTypeId: string;
  instructorId: string;
  date: Date | string;
  recurrenceKind?: string | null;
  recurrenceWeekdays?: string | null;
  seriesWeekCount?: number | null;
  seriesId?: string | null;
  flexiEnabled?: boolean | null;
  flexiSelectionCount?: number | null;
}

export interface FlexiSelectionCandidate {
  weekday: number;
  sourceSeriesId: string;
  sourceClassId: string;
  timeLabel: string;
}

export const FLEXI_WEEKDAY_OPTIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Temporary kill switch for Flexi booking. While false, members only get Fixed Slots
 * (badges, checkout toggle, options API, and new Flexi bookings are all gated).
 * Set to true to re-enable Flexi without changing per-schedule `flexiEnabled` flags.
 */
export const FLEXI_BOOKING_ENABLED = false;

/** Per-schedule Flexi config (ignores the site-wide kill switch). */
export function hasFlexiScheduleConfig(schedule: FlexiEligibleScheduleLike | null | undefined): boolean {
  return !!schedule?.flexiEnabled && schedule.recurrenceKind === "weekly" && !!schedule.seriesId;
}

export function isFlexiEnabledSchedule(schedule: FlexiEligibleScheduleLike | null | undefined): boolean {
  return FLEXI_BOOKING_ENABLED && hasFlexiScheduleConfig(schedule);
}

export function resolveFlexiSelectionCount(
  schedule: FlexiEligibleScheduleLike | null | undefined,
  programSessionsPerWeek?: number | null,
): number {
  // Program owns N (SPEC A4). Schedule weekdays are only a legacy fallback for options UI.
  if (programSessionsPerWeek != null && programSessionsPerWeek > 0) {
    return programSessionsPerWeek;
  }
  return parseRecurrenceWeekdays(schedule?.recurrenceWeekdays).length;
}

export function formatFlexiTimeLabel(date: Date | string): string {
  return formatIstTime(date);
}

export function buildFlexiCandidate(
  schedule: FlexiEligibleScheduleLike,
  weekday: number,
): FlexiSelectionCandidate {
  return {
    weekday,
    sourceSeriesId: schedule.seriesId ?? "",
    sourceClassId: schedule.id,
    timeLabel: formatFlexiTimeLabel(schedule.date),
  };
}

/** Pool by class type (any instructor) — product decision 3 Aug 2026. */
export function sharesFlexiPool(
  anchor: Pick<FlexiEligibleScheduleLike, "classTypeId" | "instructorId">,
  candidate: Pick<FlexiEligibleScheduleLike, "classTypeId" | "instructorId">,
): boolean {
  return anchor.classTypeId === candidate.classTypeId;
}

export function flexiTooltipCopy(): string {
  return "Pick your weekly slots from any eligible schedule of this session type (any instructor). How many slots you pick comes from your Program. Price stays the same; finalize at checkout.";
}

export interface FlexiOptionSlotLike {
  weekday: number;
  timeLabel: string;
}

/** True when Flexi offers no meaningful choice beyond the anchor fixed schedule. */
export function flexiOptionsMatchFixedSlots(
  fixedWeekdays: number[],
  fixedTimeLabel: string,
  selectionCount: number,
  options: FlexiOptionSlotLike[],
): boolean {
  if (!options.length) return true;
  if (!fixedWeekdays.length || !fixedTimeLabel) return false;

  const fixedKeys = new Set(fixedWeekdays.map((d) => `${d}:${fixedTimeLabel}`));
  const optionKeys = new Set(options.map((o) => `${o.weekday}:${o.timeLabel}`));

  if (fixedKeys.size !== optionKeys.size) return false;
  for (const key of fixedKeys) {
    if (!optionKeys.has(key)) return false;
  }
  return selectionCount === fixedWeekdays.length;
}

export interface FlexiTermItem {
  key: string;
  summary: string;
  details: string;
}

export function defaultFlexiTermsItems(): FlexiTermItem[] {
  return [
    {
      key: "non_refundable",
      summary: "Bookings are non-refundable.",
      details:
        "If there is a no-show by the instructor, an alternative session may be arranged to compensate for the session, or the session may be converted into credits as per the existing policy.",
    },
    {
      key: "flexi_final_checkout",
      summary: "You must finalize your Flexi selection at checkout.",
      details:
        "For eligible Flexi Mode schedules, you must choose your applicable practice days and times during checkout. After booking confirmation, you cannot change these selections yourself. In exceptional circumstances, the studio may review a change request at its discretion. If approved, only one change may be made for the booking or subscription, and all existing pricing, cancellation, communication, discount, offer, promotion, and credit policies will continue to apply.",
    },
    {
      key: "non_transferable",
      summary: "Your booking or package cannot be transferred or shared.",
      details:
        "A session or package booked for you cannot be transferred, reassigned, or used by another person through your login or account during the scheduled session or package duration.",
    },
  ];
}

export type FlexiSchedulePublicShape = Class & { classType?: ClassType | null };
