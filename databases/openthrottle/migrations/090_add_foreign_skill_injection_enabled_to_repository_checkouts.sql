-- Per-user opt-in switch for foreign-workspace skill injection (plan d3a30314's
-- layer). Injection is decided per (user, on-disk checkout): the same git remote
-- can be checked out by multiple users who disagree on whether OpenThrottle's
-- curated skills should be projected into their tree. repository_checkouts is the
-- per-user table (unique on (user_id, filesystem_path)), so the flag lives here —
-- NOT on the shared `repositories` identity row.
--
-- Default FALSE = opt-in: injection only runs for checkouts a user explicitly
-- enables. Mirrors the `managed` boolean already on this table (migration 078).

ALTER TABLE repository_checkouts
  ADD COLUMN IF NOT EXISTS foreign_skill_injection_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN repository_checkouts.foreign_skill_injection_enabled IS 'True when this user opts this checkout into foreign-workspace skill injection (OpenThrottle curated skills projected into .agents/skills + .claude/skills on foreign runs). Default FALSE (opt-in); gate reads it per (actor_user_id, filesystem_path) before materializing.';
