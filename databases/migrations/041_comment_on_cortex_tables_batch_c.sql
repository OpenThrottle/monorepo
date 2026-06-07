-- Batch C (plan c8be6591-7314-4b43-aaa4-6e4b7ab59e59): COMMENT ON TABLE for OpenThrottle tables (≤10 per batch).
-- Tone matches databases/migrations/038_create_plan_runs_table.sql (short purpose-focused prose).

COMMENT ON TABLE users IS 'User accounts keyed by GitHub username for authentication, subscriptions, and plan or task assignee linkage.';
