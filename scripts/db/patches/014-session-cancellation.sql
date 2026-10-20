-- Admin session cancellation + member-visible reason
ALTER TABLE classes ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE user_session_mappings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
