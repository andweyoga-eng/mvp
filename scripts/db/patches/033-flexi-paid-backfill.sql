-- Backfill stale Flexi bookings whose linked booking/payment already confirms payment.
-- This repairs member "Upcoming sessions" cards that still show pending/retry after
-- a successful checkout completed before flexi_bookings.payment_status was synced.

WITH eligible AS (
  SELECT DISTINCT fb.id
  FROM flexi_bookings fb
  LEFT JOIN bookings b ON b.id = fb.booking_id
  LEFT JOIN payments p ON p.booking_id = fb.booking_id
  WHERE fb.booking_id IS NOT NULL
    AND fb.payment_status <> 'paid'
    AND (
      b.payment_status = 'paid'
      OR p.status = 'paid'
    )
)
UPDATE flexi_bookings fb
SET
  payment_status = 'paid',
  status = 'paid',
  hold_expires_at = NULL,
  updated_at = CURRENT_TIMESTAMP
FROM eligible
WHERE fb.id = eligible.id;

WITH eligible AS (
  SELECT DISTINCT fb.id
  FROM flexi_bookings fb
  LEFT JOIN bookings b ON b.id = fb.booking_id
  LEFT JOIN payments p ON p.booking_id = fb.booking_id
  WHERE fb.booking_id IS NOT NULL
    AND (
      b.payment_status = 'paid'
      OR p.status = 'paid'
    )
)
UPDATE flexi_booking_occurrences fbo
SET
  status = 'paid',
  hold_expires_at = NULL,
  updated_at = CURRENT_TIMESTAMP
FROM eligible
WHERE fbo.flexi_booking_id = eligible.id
  AND fbo.status <> 'paid';
