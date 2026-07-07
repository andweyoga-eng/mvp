-- Waitlist marketing tags (WL-R / WL-G) and WhatsApp capture for guest sign-ups

ALTER TABLE class_type_notify_requests
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

UPDATE class_type_notify_requests
SET source = 'WL-R'
WHERE source IN ('member', 'regular');

UPDATE class_type_notify_requests
SET source = 'WL-G'
WHERE source IN ('guest', 'public');

UPDATE class_type_notify_requests
SET source = CASE WHEN user_id IS NOT NULL THEN 'WL-R' ELSE 'WL-G' END
WHERE source IS NULL OR TRIM(source) = '';
