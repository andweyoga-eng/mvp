-- weDiet Track Diet v2: multi-item meal group fields on fuel_meals
-- SPEC-WEDIET-TRACK-DIET-V2

ALTER TABLE fuel_meals
  ADD COLUMN IF NOT EXISTS meal_group_id varchar,
  ADD COLUMN IF NOT EXISTS meal_title text,
  ADD COLUMN IF NOT EXISTS weight_g integer,
  ADD COLUMN IF NOT EXISTS capture_method varchar(16),
  ADD COLUMN IF NOT EXISTS confidence real,
  ADD COLUMN IF NOT EXISTS macros jsonb;

CREATE INDEX IF NOT EXISTS fuel_meals_user_group_idx
  ON fuel_meals (user_id, meal_group_id)
  WHERE meal_group_id IS NOT NULL;
