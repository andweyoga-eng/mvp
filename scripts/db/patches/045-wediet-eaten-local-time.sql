-- weDiet: eaten_local_time for late-log into meal slot
ALTER TABLE fuel_meals
  ADD COLUMN IF NOT EXISTS eaten_local_time text;
