-- Companies Act s.128: keep payment ledger rows for at least eight years.
-- Replace cascading FK deletes with SET NULL so class/booking/user removal cannot
-- wipe books of account.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'payments'::regclass
      AND c.contype = 'f'
      AND c.confrelid IN (
        'bookings'::regclass,
        'classes'::regclass,
        'users'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE payments
  ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE payments
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_booking_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_class_id_fkey,
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE payments
  ADD CONSTRAINT payments_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  ADD CONSTRAINT payments_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
