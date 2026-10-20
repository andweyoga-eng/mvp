-- SPEC-SESSIONS-01 Part B: session_ledger (append-only entitlement events).
CREATE TABLE IF NOT EXISTS session_ledger (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id varchar NOT NULL REFERENCES subscriptions(id),
  occurrence_id varchar,
  event_type varchar(32) NOT NULL,
  d_scheduled integer NOT NULL DEFAULT 0,
  d_consumed integer NOT NULL DEFAULT 0,
  d_unscheduled integer NOT NULL DEFAULT 0,
  d_credited integer NOT NULL DEFAULT 0,
  value_paise integer NOT NULL DEFAULT 0,
  actor text NOT NULL DEFAULT 'system',
  reason text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS session_ledger_occurrence_event_uidx
  ON session_ledger (occurrence_id, event_type)
  WHERE occurrence_id IS NOT NULL;
