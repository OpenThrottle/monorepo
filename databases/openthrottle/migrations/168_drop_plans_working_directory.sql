-- Drop the orphan plans.working_directory column.
--
-- No migration in this tree creates it and no entity maps it: it exists only on databases that
-- predate the migrations folder, and it has been NULL on every row (0 of 1300 non-null on the
-- shared dev DB, 2026-11-17). A run's working directory travels in
-- plans.run_config_json -> workspace.workingDirectory and in the enqueue job data instead.
-- A fresh database never has the column, so dropping it is the one path that converges every DB.
--
-- Idempotent: DROP COLUMN IF EXISTS is a no-op where the column was never created.

ALTER TABLE plans DROP COLUMN IF EXISTS working_directory;
