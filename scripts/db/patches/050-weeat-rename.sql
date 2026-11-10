-- weEat: migrate databases that already stored the weDiet names.
-- Patch 046 now creates feature_weeat directly. This patch copies any leftover
-- weDiet column and platform_settings keys, then removes them.
-- Safe to re-run: no-op once the old names are gone.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'feature_wediet'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'feature_weeat'
  ) THEN
    UPDATE programs SET feature_weeat = feature_wediet;
    ALTER TABLE programs DROP COLUMN feature_wediet;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'programs'
      AND column_name = 'feature_wediet'
  ) THEN
    ALTER TABLE programs RENAME COLUMN feature_wediet TO feature_weeat;
  END IF;
END $$;

INSERT INTO platform_settings (key, value)
SELECT 'feature_weeat_visible', value
FROM platform_settings
WHERE key = 'feature_wediet_visible'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO platform_settings (key, value)
SELECT 'feature_weeat_interactive', value
FROM platform_settings
WHERE key = 'feature_wediet_interactive'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DELETE FROM platform_settings
WHERE key IN ('feature_wediet_visible', 'feature_wediet_interactive');
