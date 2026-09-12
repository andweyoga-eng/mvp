-- Health note version history (archived notes, max 5 enforced in application code)
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_update_history jsonb NOT NULL DEFAULT '[]'::jsonb;
