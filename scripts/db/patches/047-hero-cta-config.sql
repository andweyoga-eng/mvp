-- GTM Operations: hero carousel CTA config (label + section/url per slide)
-- Stored as a JSON platform_settings row; dedicated admin API (all admins).

INSERT INTO platform_settings (key, value)
VALUES (
  'hero_cta_config',
  '{
    "applySameLinkToAll": true,
    "slides": [
      {"label":"Find Your Flow","mode":"section","sectionId":"teach","customUrl":""},
      {"label":"Find Your Flow","mode":"section","sectionId":"teach","customUrl":""},
      {"label":"Find Your Flow","mode":"section","sectionId":"teach","customUrl":""},
      {"label":"Find Your Flow","mode":"section","sectionId":"teach","customUrl":""},
      {"label":"Find Your Flow","mode":"section","sectionId":"teach","customUrl":""},
      {"label":"Find Your Flow","mode":"section","sectionId":"teach","customUrl":""}
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
