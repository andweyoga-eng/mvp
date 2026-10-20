-- Per-session checkout copy: what the session includes and excludes.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS inclusions TEXT;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS exclusions TEXT;
