-- WhatsApp contact consent (audit fields on users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_consent boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_consent_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_consent_source text;

-- Mailing address (contact info section)
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_pincode text;
