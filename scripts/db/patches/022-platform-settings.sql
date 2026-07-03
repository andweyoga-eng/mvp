-- Platform settings: runtime feature flags controlled by super admin (SPEC-GG-01)

CREATE TABLE IF NOT EXISTS platform_settings (
  key varchar(64) PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by varchar REFERENCES admin_users(id)
);

INSERT INTO platform_settings (key, value)
VALUES ('guest_checkout_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
