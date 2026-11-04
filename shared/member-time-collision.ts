/**
 * SPEC-SESSIONS-01 FR-17 — member time collision across subscriptions.
 *
 * Defaults:
 * - Half-open intervals [start, end): touching end-to-start is allowed.
 * - Held = paid | waived | active pending/failed payment hold.
 * - Cancelled mapping / expired hold / released seat = free.
 * - Same classId is not an FR-17 collision (handled by already_booked).
 */
import {
  BOOKING_PAYMENT_STATUS,
  isPaymentHoldActive,
} from "./booking-payment-hold";

export type TimeIntervalMs = {
  startMs: number;
  endMs: number;
};

export function sessionIntervalMs(
  start: Date | string | number,
  durationMinutes: number,
): TimeIntervalMs {
  const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const minutes = durationMinutes > 0 ? durationMinutes : 60;
  return { startMs, endMs: startMs + minutes * 60_000 };
}

/** True when intervals overlap in time. Adjacent (a.end === b.start) is NOT overlap. */
export function intervalsOverlap(a: TimeIntervalMs, b: TimeIntervalMs): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** Whether this booking still holds a seat for FR-17 collision purposes. */
export function bookingHoldsSeatForCollision(params: {
  paymentStatus: string;
  heldUntil?: Date | string | null;
  mappingStatus?: string | null;
  nowMs?: number;
}): boolean {
  if (params.mappingStatus === "cancelled") return false;
  const now = params.nowMs ?? Date.now();
  const status = params.paymentStatus;
  if (
    status === BOOKING_PAYMENT_STATUS.CANCELLED_BY_USER ||
    status === BOOKING_PAYMENT_STATUS.HOLD_EXPIRED
  ) {
    return false;
  }
  if (
    status === BOOKING_PAYMENT_STATUS.PAID ||
    status === BOOKING_PAYMENT_STATUS.WAIVED
  ) {
    return true;
  }
  if (status === BOOKING_PAYMENT_STATUS.PENDING) {
    // Active hold (or legacy pending without heldUntil) occupies the seat.
    if (params.heldUntil == null) return true;
    return isPaymentHoldActive(params.heldUntil, now);
  }
  if (status === BOOKING_PAYMENT_STATUS.FAILED) {
    return isPaymentHoldActive(params.heldUntil, now);
  }
  return false;
}

export type ProposedOccurrence = {
  classId: string;
  startMs: number;
  endMs: number;
  label?: string;
};

export type HeldOccurrence = {
  classId: string;
  startMs: number;
  endMs: number;
  label?: string;
};

export type TimeCollision = {
  proposedClassId: string;
  heldClassId: string;
  proposedLabel?: string;
  heldLabel?: string;
};

/**
 * Find FR-17 collisions between proposed occurrences and already-held ones.
 * Same classId is ignored (duplicate booking is a different rule).
 */
export function findTimeCollisions(
  proposed: ProposedOccurrence[],
  held: HeldOccurrence[],
): TimeCollision[] {
  const collisions: TimeCollision[] = [];
  for (const p of proposed) {
    for (const h of held) {
      if (p.classId === h.classId) continue;
      if (
        intervalsOverlap(
          { startMs: p.startMs, endMs: p.endMs },
          { startMs: h.startMs, endMs: h.endMs },
        )
      ) {
        collisions.push({
          proposedClassId: p.classId,
          heldClassId: h.classId,
          proposedLabel: p.label,
          heldLabel: h.label,
        });
      }
    }
  }
  return collisions;
}

/** Also reject if two proposed slots overlap each other (bad composition). */
export function findInternalProposedCollisions(
  proposed: ProposedOccurrence[],
): TimeCollision[] {
  const collisions: TimeCollision[] = [];
  for (let i = 0; i < proposed.length; i++) {
    for (let j = i + 1; j < proposed.length; j++) {
      const a = proposed[i]!;
      const b = proposed[j]!;
      if (a.classId === b.classId) continue;
      if (
        intervalsOverlap(
          { startMs: a.startMs, endMs: a.endMs },
          { startMs: b.startMs, endMs: b.endMs },
        )
      ) {
        collisions.push({
          proposedClassId: a.classId,
          heldClassId: b.classId,
          proposedLabel: a.label,
          heldLabel: b.label,
        });
      }
    }
  }
  return collisions;
}

export function formatTimeCollisionMessage(collision: TimeCollision): string {
  const held = collision.heldLabel ?? "another session you already hold";
  const proposed = collision.proposedLabel ?? "this session";
  return `You already have a session that overlaps ${proposed} (${held}). Choose a different time.`;
}
