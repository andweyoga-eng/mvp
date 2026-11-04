-- Flexi Mode schedule attributes + booking package tables

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS flexi_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flexi_selection_count INTEGER;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS flexi_booking_id VARCHAR;

CREATE TABLE IF NOT EXISTS flexi_bookings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  anchor_class_id VARCHAR NOT NULL REFERENCES classes(id),
  class_type_id VARCHAR NOT NULL REFERENCES class_types(id),
  instructor_id VARCHAR NOT NULL REFERENCES instructors(id),
  subscription_id VARCHAR,
  booking_id VARCHAR REFERENCES bookings(id),
  selection_count INTEGER NOT NULL,
  horizon_start_at TIMESTAMP NOT NULL,
  horizon_end_at TIMESTAMP NOT NULL,
  hold_expires_at TIMESTAMP,
  payment_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  edit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flexi_booking_selections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  flexi_booking_id VARCHAR NOT NULL REFERENCES flexi_bookings(id),
  weekday INTEGER NOT NULL,
  source_series_id VARCHAR NOT NULL,
  source_class_id VARCHAR NOT NULL REFERENCES classes(id),
  source_time_label TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flexi_booking_occurrences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  flexi_booking_id VARCHAR NOT NULL REFERENCES flexi_bookings(id),
  class_id VARCHAR NOT NULL REFERENCES classes(id),
  weekday INTEGER NOT NULL,
  occurrence_date TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  hold_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flexi_bookings_user ON flexi_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_flexi_bookings_booking ON flexi_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_flexi_booking_occurrences_class ON flexi_booking_occurrences(class_id);
CREATE INDEX IF NOT EXISTS idx_flexi_booking_occurrences_date ON flexi_booking_occurrences(occurrence_date);
