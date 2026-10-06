-- Selected weekdays for weekly recurring series (comma-separated 0–6, Sun–Sat)

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS recurrence_weekdays VARCHAR(32),
  ADD COLUMN IF NOT EXISTS series_week_count INTEGER;
