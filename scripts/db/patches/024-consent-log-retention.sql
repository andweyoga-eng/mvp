ALTER TABLE consent_audit_logs
  DROP CONSTRAINT IF EXISTS consent_audit_logs_actor_check;

ALTER TABLE consent_audit_logs
  ADD CONSTRAINT consent_audit_logs_actor_check CHECK (
    (user_id IS NOT NULL AND booking_id IS NULL)
    OR (user_id IS NULL AND booking_id IS NOT NULL)
    OR (user_id IS NULL AND booking_id IS NULL)
  );
