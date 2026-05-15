-- Admin auth slice 1: bcrypt password storage
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS password_hash text;
