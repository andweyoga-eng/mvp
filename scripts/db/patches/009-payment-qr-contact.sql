-- Contact details on standalone payment QR codes (shown to members when paying)

ALTER TABLE payment_qr_codes
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

UPDATE payment_qr_codes
SET
  contact_phone = COALESCE(NULLIF(TRIM(contact_phone), ''), '+910000000000'),
  contact_email = COALESCE(NULLIF(TRIM(contact_email), ''), 'payments@andweyoga.com')
WHERE contact_phone IS NULL OR contact_email IS NULL OR TRIM(contact_phone) = '' OR TRIM(contact_email) = '';

ALTER TABLE payment_qr_codes
  ALTER COLUMN contact_phone SET NOT NULL,
  ALTER COLUMN contact_email SET NOT NULL;
