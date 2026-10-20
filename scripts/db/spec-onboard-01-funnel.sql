-- SPEC-ONBOARD-01 FR-09 funnel counts.
-- Run against the database before deploy, then again 7 and 14 days after release.
-- Do not run this from the app. Save the five numbers next to the date you ran it.
-- Window: last 30 days from the time you execute the script.

-- 1. Accounts created
SELECT count(*) AS accounts_created
FROM users
WHERE created_at >= now() - interval '30 days';

-- 2. Reached L1: distinct users with a terms opt-in in the window
SELECT count(DISTINCT user_id) AS reached_l1
FROM consent_audit_logs
WHERE consent_type = 'terms'
  AND action = 'opt_in'
  AND timestamp_utc >= now() - interval '30 days';

-- 3. Reached L2: accounts created in the window that are ready to book
SELECT count(*) AS reached_l2
FROM users
WHERE created_at >= now() - interval '30 days'
  AND profile_completion_status = 'complete';

-- 4. Started a booking
SELECT count(DISTINCT user_id) AS started_booking
FROM bookings
WHERE created_at >= now() - interval '30 days'
  AND user_id IS NOT NULL;

-- 5. Paid a booking
SELECT count(DISTINCT user_id) AS paid_booking
FROM bookings
WHERE created_at >= now() - interval '30 days'
  AND user_id IS NOT NULL
  AND payment_status = 'paid';
