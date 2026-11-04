-- Session scheduling metadata (manual + future calendar sync)

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS schedule_source VARCHAR(32) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS recurrence_kind VARCHAR(16) NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS series_id VARCHAR,
  ADD COLUMN IF NOT EXISTS external_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE INDEX IF NOT EXISTS classes_series_id_idx ON classes (series_id);
CREATE INDEX IF NOT EXISTS classes_schedule_source_idx ON classes (schedule_source);
