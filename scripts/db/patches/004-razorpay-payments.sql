-- Razorpay payments + booking payment status (idempotent)

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id VARCHAR NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  amount_paise INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  receipt_url TEXT,
  invoice_url TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_razorpay_order_id_idx
  ON payments (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments (booking_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments (user_id);
