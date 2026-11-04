-- Guest checkout: store contact on booking without creating a users row.

ALTER TABLE bookings
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_guest_checkout BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

ALTER TABLE payments
  ALTER COLUMN user_id DROP NOT NULL;
