-- SPEC-SESSIONS-01 A2: rename Mudit Yoga duplicate, unique class-type names,
-- partial unique index on active programs.
-- Idempotent.

-- OI-12: keep the first "Mudit Yoga" row; rename the second to "Mudit Yoga Flexi".
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM class_types
  WHERE lower(btrim(name)) = 'mudit yoga'
)
UPDATE class_types
SET name = 'Mudit Yoga Flexi'
WHERE id IN (SELECT id FROM ranked WHERE rn >= 2)
  AND lower(btrim(name)) = 'mudit yoga';

-- Case-insensitive + trim uniqueness for class type names.
CREATE UNIQUE INDEX IF NOT EXISTS class_types_name_ci_uidx
  ON class_types (lower(btrim(name)));

-- Only one active Program per shape (class type + kind + per week + duration).
CREATE UNIQUE INDEX IF NOT EXISTS programs_active_shape_uidx
  ON programs (class_type_id, kind, sessions_per_week, duration_weeks)
  WHERE status = 'active';
