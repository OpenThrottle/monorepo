-- Drop idx_work_session_subjects_session_id (OT plan 5e20f80a, task f60bc5e8).
--
-- Migration 068 created a plain btree on work_session_subjects (session_id) next to the unique
-- index uq_work_session_subjects_session_plan_task on
-- (session_id, plan_id, COALESCE(task_id, zero-uuid)). session_id is the plain leading column of
-- that unique index, so Postgres answers `WHERE session_id = ?` from it and the narrow index earns
-- nothing while it still costs on every write to a table past 11k rows on the dev database.
--
-- 102's redundant-index sweep missed this one because it skipped expression indexes, and the
-- unique index's third key is an expression. Its leading key is not, which is all a
-- `session_id = ?` lookup needs.
--
-- The index backs no constraint, so a plain DROP INDEX is correct. IF EXISTS keeps it idempotent.

DROP INDEX IF EXISTS idx_work_session_subjects_session_id; -- < uq_work_session_subjects_session_plan_task
