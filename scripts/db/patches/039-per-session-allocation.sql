-- SPEC-SESSIONS-01 A1.1: frozen per-session allocation (CA Accounting Policy).
-- Rupees per session, NUMERIC(18,8). Nullable so existing rows are a no-op until backfill.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS per_session_allocation NUMERIC(18, 8);

-- Backfill from what was paid when both contract fields exist.
UPDATE subscriptions
SET per_session_allocation = ROUND(
  (total_paid_paise::numeric / 100.0) / NULLIF(sessions_purchased, 0),
  8
)
WHERE per_session_allocation IS NULL
  AND total_paid_paise IS NOT NULL
  AND sessions_purchased IS NOT NULL
  AND sessions_purchased > 0;
