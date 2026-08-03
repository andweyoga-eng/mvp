-- SPEC-SESSIONS-01 Part C: policy clickwrap columns + refund tracking.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_policy_version varchar(64),
  ADD COLUMN IF NOT EXISTS cancellation_policy_accepted_at timestamp;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS razorpay_refund_id text,
  ADD COLUMN IF NOT EXISTS refund_status varchar(24),
  ADD COLUMN IF NOT EXISTS refund_amount_paise integer,
  ADD COLUMN IF NOT EXISTS refund_initiated_at timestamp,
  ADD COLUMN IF NOT EXISTS refund_processed_at timestamp;
