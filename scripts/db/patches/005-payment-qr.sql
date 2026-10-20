-- Payment QR codes (reusable assets) and session/booking payment workflow

CREATE TABLE IF NOT EXISTS payment_qr_codes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS payment_method varchar(20) NOT NULL DEFAULT 'razorpay';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS payment_qr_code_id varchar REFERENCES payment_qr_codes(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS qr_contact_phone text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS qr_contact_email text;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method varchar(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transaction_ack_number text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verification_status varchar(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ack_submitted_at timestamp;
