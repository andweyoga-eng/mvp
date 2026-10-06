ALTER TABLE erasure_requests
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS erasure_requests_status_schedule_idx
  ON erasure_requests (status, scheduled_erasure_at);
