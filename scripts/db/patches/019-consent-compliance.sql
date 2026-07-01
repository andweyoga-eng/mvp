-- Consent compliance: audit logs, erasure requests, user DOB, guest consent flags on bookings

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date;

CREATE TABLE IF NOT EXISTS consent_audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  booking_id varchar REFERENCES bookings(id) ON DELETE SET NULL,
  consent_type varchar(32) NOT NULL,
  action varchar(16) NOT NULL,
  consent_version varchar(64) NOT NULL,
  ip_address text,
  user_agent text,
  timestamp_utc timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT consent_audit_logs_actor_check CHECK (
    (user_id IS NOT NULL AND booking_id IS NULL)
    OR (user_id IS NULL AND booking_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_logs_user_id ON consent_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_logs_booking_id ON consent_audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_logs_timestamp ON consent_audit_logs(timestamp_utc DESC);

CREATE TABLE IF NOT EXISTS erasure_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending',
  requested_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_erasure_at timestamp NOT NULL,
  completed_at timestamp,
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_erasure_requests_user_id ON erasure_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_status ON erasure_requests(status);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_consent_profile boolean;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_consent_terms boolean;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_consent_age boolean;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_consent_at timestamp;
