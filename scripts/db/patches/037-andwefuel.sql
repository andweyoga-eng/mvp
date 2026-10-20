-- andWeFuel Calorie Bank (SPEC-FUEL-01)
-- Per-member target/deficit/meal plan; meal ledger; curated recipe + video.
-- Photos are never persisted (transit-only estimation).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_calorie_target_cal integer,
  ADD COLUMN IF NOT EXISTS daily_deficit_cal integer,
  ADD COLUMN IF NOT EXISTS fuel_meal_plan jsonb,
  ADD COLUMN IF NOT EXISTS calorie_target_set_by varchar,
  ADD COLUMN IF NOT EXISTS calorie_target_set_at timestamp,
  ADD COLUMN IF NOT EXISTS fuel_floor_override_reason text;

CREATE TABLE IF NOT EXISTS fuel_meals (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date text NOT NULL,
  logged_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name text NOT NULL,
  calories integer NOT NULL,
  target_at_log_cal integer NOT NULL,
  meal_slot_index integer,
  client_local_time text,
  client_time_zone text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS fuel_meals_user_date_idx ON fuel_meals (user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS fuel_meals_user_created_idx ON fuel_meals (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fuel_recipes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  for_date text NOT NULL UNIQUE,
  title text NOT NULL,
  teaser text NOT NULL,
  ingredients text NOT NULL,
  method text NOT NULL,
  image_url text,
  approx_kcal integer,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_daily_media (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  for_date text NOT NULL UNIQUE,
  provider varchar(16) NOT NULL,
  embed_id text NOT NULL,
  title text NOT NULL,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
