-- Platform features: user admin flags, session publish/pause, mood & attendance placeholders

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_attendance_count integer NOT NULL DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'published';

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS published_at timestamp;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS paused_at timestamp;

-- Backfill published_at for existing rows
UPDATE classes SET published_at = COALESCE(published_at, date) WHERE published_at IS NULL;

-- Pre/post session mood check-ins (MVP schema; instructor aggregate API TBD)
CREATE TABLE IF NOT EXISTS session_mood_checkins (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  class_id varchar NOT NULL REFERENCES classes(id),
  phase varchar(10) NOT NULL,
  mood_id varchar(32) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_mood_class_phase ON session_mood_checkins(class_id, phase);

-- Meet link click → attendance shadow (full Meet attendance API not available)
CREATE TABLE IF NOT EXISTS session_join_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  class_id varchar NOT NULL REFERENCES classes(id),
  joined_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_join_user ON session_join_events(user_id);
