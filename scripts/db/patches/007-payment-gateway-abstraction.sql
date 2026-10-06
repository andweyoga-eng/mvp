-- Payment gateway abstraction: provider metadata, payer details, admin disposition

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS gateway_reference TEXT,
  ADD COLUMN IF NOT EXISTS payer_name TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone TEXT,
  ADD COLUMN IF NOT EXISTS admin_disposition VARCHAR(20) NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS payments_admin_disposition_idx ON payments (admin_disposition);
CREATE INDEX IF NOT EXISTS payments_gateway_provider_idx ON payments (gateway_provider);

-- Backfill gateway provider for existing Razorpay rows
UPDATE payments
SET gateway_provider = 'razorpay',
    gateway_reference = COALESCE(gateway_reference, razorpay_payment_id, razorpay_order_id),
    admin_disposition = CASE
      WHEN status = 'paid' THEN 'received'
      WHEN status = 'failed' THEN 'failed'
      WHEN status = 'refunded' THEN 'dispute'
      ELSE 'pending'
    END
WHERE gateway_provider IS NULL AND (razorpay_order_id IS NOT NULL OR razorpay_payment_id IS NOT NULL);

-- Legacy session payment_method 'razorpay' → payment link flow
UPDATE classes SET payment_method = 'razorpay_link' WHERE payment_method = 'razorpay';
UPDATE bookings SET payment_method = 'razorpay_link' WHERE payment_method = 'razorpay';
