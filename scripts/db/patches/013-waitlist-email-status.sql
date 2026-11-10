-- Track waitlist notification fanout status per request
ALTER TABLE class_type_notify_requests
  ADD COLUMN IF NOT EXISTS email_send_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_send_error TEXT,
  ADD COLUMN IF NOT EXISTS email_send_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMP;
