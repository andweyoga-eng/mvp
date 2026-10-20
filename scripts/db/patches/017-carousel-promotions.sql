-- Manually curated "Available Today" carousel promotions (super admin only)

CREATE TABLE IF NOT EXISTS carousel_promotions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id varchar NOT NULL REFERENCES classes(id),
  position integer NOT NULL DEFAULT 0,
  start_at timestamp NOT NULL,
  end_at timestamp NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carousel_promotions_window
  ON carousel_promotions (enabled, start_at, end_at);
