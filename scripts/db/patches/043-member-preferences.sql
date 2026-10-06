-- Member Preferences (session reminders, email updates, offers).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pref_session_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pref_email_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pref_offers_promos boolean NOT NULL DEFAULT false;
