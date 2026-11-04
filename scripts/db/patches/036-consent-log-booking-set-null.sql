-- DPDP Act 2023: consent audit log rows must survive booking deletion as
-- burden-of-proof records. deleteClassDependents() now detaches booking_id
-- instead of deleting the row — make the FK enforce SET NULL to match.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'consent_audit_logs'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'bookings'::regclass
  LOOP
    EXECUTE format('ALTER TABLE consent_audit_logs DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE consent_audit_logs
  ADD CONSTRAINT consent_audit_logs_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
