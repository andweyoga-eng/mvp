-- SPEC-PLATFORM-FEATURE-GATES-01: platform toggles + program feature-tab placeholders

INSERT INTO platform_settings (key, value)
VALUES
  ('feature_wediet_visible', 'true'::jsonb),
  ('feature_wediet_interactive', 'true'::jsonb),
  ('feature_weemo_visible', 'true'::jsonb),
  ('feature_weemo_interactive', 'true'::jsonb),
  ('feature_webuild_visible', 'true'::jsonb),
  ('feature_webuild_interactive', 'true'::jsonb),
  ('feature_andweyoga_always_available', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS feature_wediet boolean NOT NULL DEFAULT false;

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS feature_weemo boolean NOT NULL DEFAULT false;

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS feature_webuild boolean NOT NULL DEFAULT false;

-- andWeYOGa always implied on programs (greyed in admin UI when platform policy is on)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS feature_andweyoga boolean NOT NULL DEFAULT true;
