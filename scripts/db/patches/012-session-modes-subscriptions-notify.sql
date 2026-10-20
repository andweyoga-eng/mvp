-- Session delivery/frequency, notify-me, admin profile, subscriptions

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(16) NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS session_frequency VARCHAR(16) NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS venue_address TEXT,
  ADD COLUMN IF NOT EXISTS venue_map_link TEXT,
  ADD COLUMN IF NOT EXISTS venue_contact_phone TEXT;

CREATE TABLE IF NOT EXISTS admin_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id VARCHAR NOT NULL REFERENCES admin_users(id),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  government_id_image_url TEXT,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_type_notify_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id VARCHAR NOT NULL REFERENCES class_types(id),
  user_id VARCHAR REFERENCES users(id),
  email TEXT NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'public',
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  class_type_id VARCHAR NOT NULL REFERENCES class_types(id),
  booking_id VARCHAR REFERENCES bookings(id),
  subscription_type VARCHAR(16) NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 1,
  utilized_sessions INTEGER NOT NULL DEFAULT 0,
  refunded_sessions INTEGER NOT NULL DEFAULT 0,
  disputed_sessions INTEGER NOT NULL DEFAULT 0,
  disputes_resolved INTEGER NOT NULL DEFAULT 0,
  waived_sessions INTEGER NOT NULL DEFAULT 0,
  total_amount_paise INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
