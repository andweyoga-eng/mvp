-- Instructor email verification method + OTP link token

ALTER TABLE instructors ADD COLUMN IF NOT EXISTS verification_method varchar(32) NOT NULL DEFAULT 'pending';
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email_verification_token text;

-- Grandfather existing verified instructors
UPDATE instructors
SET verification_method = 'otp-verified'
WHERE email_verified = true AND verification_method = 'pending';
