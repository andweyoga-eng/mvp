-- Coupon codes for checkout discounts (admin-managed, OTP-gated creation)

CREATE TABLE IF NOT EXISTS coupon_codes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL UNIQUE,
  discount_type varchar(16) NOT NULL, -- fixed | percent
  discount_value integer NOT NULL, -- paise for fixed, basis points * 100 for percent (0-10000 = 0-100%)
  class_type_id varchar REFERENCES class_types(id),
  class_id varchar REFERENCES classes(id),
  expires_at timestamp NOT NULL,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  status varchar(16) NOT NULL DEFAULT 'active', -- active | revoked
  created_by_admin_id varchar NOT NULL REFERENCES admin_users(id),
  notes text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON coupon_codes (code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_expires ON coupon_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_status ON coupon_codes (status);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id varchar NOT NULL REFERENCES coupon_codes(id),
  user_id varchar REFERENCES users(id),
  booking_id varchar REFERENCES bookings(id),
  payment_id varchar REFERENCES payments(id),
  class_type_id varchar REFERENCES class_types(id),
  class_id varchar REFERENCES classes(id),
  original_amount_paise integer NOT NULL,
  discount_amount_paise integer NOT NULL,
  final_amount_paise integer NOT NULL,
  redeemed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions (user_id);

CREATE TABLE IF NOT EXISTS coupon_share_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id varchar NOT NULL REFERENCES coupon_codes(id),
  admin_id varchar NOT NULL REFERENCES admin_users(id),
  user_id varchar NOT NULL REFERENCES users(id),
  channel varchar(16) NOT NULL, -- email | sms | whatsapp
  status varchar(16) NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
  error_message text,
  sent_at timestamp,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_share_logs_coupon ON coupon_share_logs (coupon_id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS coupon_id varchar REFERENCES coupon_codes(id),
  ADD COLUMN IF NOT EXISTS original_amount_paise integer,
  ADD COLUMN IF NOT EXISTS discount_amount_paise integer NOT NULL DEFAULT 0;
