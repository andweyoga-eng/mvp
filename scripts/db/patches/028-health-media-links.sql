-- Google Drive / Docs link references for health materials (no file bytes stored)
ALTER TABLE users ADD COLUMN IF NOT EXISTS health_media_links jsonb NOT NULL DEFAULT '[]'::jsonb;
