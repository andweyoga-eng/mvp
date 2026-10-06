-- andWeProgress: admin/super-admin section comment threads (health / calorie)
-- Soft-edit + soft-delete for audit; nullable instructor ack for future session-join gate.

CREATE TABLE IF NOT EXISTS progress_section_comments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section varchar(32) NOT NULL,
  body text NOT NULL,
  author_admin_id varchar NOT NULL REFERENCES admin_users(id),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at timestamp,
  edited_by_admin_id varchar REFERENCES admin_users(id),
  deleted_at timestamp,
  deleted_by_admin_id varchar REFERENCES admin_users(id),
  instructor_ack_required boolean NOT NULL DEFAULT false,
  acknowledged_at timestamp,
  acknowledged_by_instructor_id varchar REFERENCES instructors(id)
);

CREATE INDEX IF NOT EXISTS progress_section_comments_user_section_idx
  ON progress_section_comments (user_id, section, created_at DESC);

CREATE INDEX IF NOT EXISTS progress_section_comments_ack_pending_idx
  ON progress_section_comments (user_id, section)
  WHERE instructor_ack_required = true AND acknowledged_at IS NULL AND deleted_at IS NULL;
