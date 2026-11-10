-- Name captured when someone joins a waitlist without an account.

ALTER TABLE class_type_notify_requests
  ADD COLUMN IF NOT EXISTS guest_name TEXT;
