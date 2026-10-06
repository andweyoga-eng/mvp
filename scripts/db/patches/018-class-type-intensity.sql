-- Practice intensity classification for class types (Gentle | Moderate | Dynamic | Restorative).
-- Used by the member Calendar intensity filter.

ALTER TABLE class_types
  ADD COLUMN IF NOT EXISTS intensity varchar(24) NOT NULL DEFAULT 'Moderate';
