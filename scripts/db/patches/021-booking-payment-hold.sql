-- Guest payment failure hold + voluntary checkout cancel statuses
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS held_until timestamp;
