-- SPEC-SESSIONS-01 A4 cleanup: weekly selection count lives on programs.sessions_per_week.
-- Stop using classes.flexi_selection_count (FR blast radius / master §8.4).
ALTER TABLE classes DROP COLUMN IF EXISTS flexi_selection_count;
