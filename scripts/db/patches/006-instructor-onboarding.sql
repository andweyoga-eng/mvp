-- Instructor onboarding: contact, verification, onboarding QR, licenses, operational status

ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email_otp_hash text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email_otp_expires_at timestamp;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS onboarding_qr_image_url text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS status varchar(32) NOT NULL DEFAULT 'pending';
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS status_notes text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS ycb_registration_number text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS ycb_license_status varchar(32) NOT NULL DEFAULT 'pending';
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS ycb_admin_comment text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS yoga_alliance_registration_number text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS yoga_alliance_license_status varchar(32) NOT NULL DEFAULT 'pending';
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS yoga_alliance_admin_comment text;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing seed rows: treat as grandfathered active instructors
UPDATE instructors
SET
  status = 'active',
  email_verified = true,
  phone_verified = true
WHERE email IS NULL AND phone IS NULL AND onboarding_qr_image_url IS NULL;
