-- Session optional links (admin dashboard create session)
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS google_meet_link text;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS razorpay_link text;
