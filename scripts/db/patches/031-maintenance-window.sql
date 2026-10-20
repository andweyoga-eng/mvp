-- Maintenance window overlay for public member web app (super admin toggle)

INSERT INTO platform_settings (key, value)
VALUES ('maintenance_window_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
