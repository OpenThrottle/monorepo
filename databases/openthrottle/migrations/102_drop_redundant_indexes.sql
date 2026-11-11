-- Drop indexes fully covered by a wider index on the same table
-- (OT plan 70239a50, task 81a2ae47).
--
-- A btree on (a) is redundant when another btree on (a, b, ...) exists with the
-- same partial predicate: Postgres can satisfy `WHERE a = ?` from the leading
-- column of the composite, so the narrow index earns nothing. It still costs on
-- every INSERT, UPDATE and DELETE of the table, still has to be vacuumed, and
-- still occupies cache.
--
-- A catalog sweep (pg_index, matching on identical partial predicates and
-- leading-column prefixes, excluding expression indexes and constraint-backed
-- ones) found 17. The plan called out two by name and noted it had capped the
-- rest; all 17 are dropped here, because they are one finding under one
-- mechanical rule and leaving fifteen behind only schedules another migration.
--
-- Two shapes appear:
--   * LEFT PREFIX -- e.g. idx_tasks_plan_id (plan_id) under
--     idx_tasks_plan_id_sort_order (plan_id, sort_order).
--   * IDENTICAL KEYS, one UNIQUE -- e.g. idx_projects_nx_project_name and
--     idx_projects_nx_project_name_unique, same column and same
--     `WHERE nx_project_name IS NOT NULL` predicate. The unique index serves
--     every read the plain one did.
--
-- None of the 17 backs a constraint (verified against pg_constraint.conindid),
-- so a plain DROP INDEX is correct and no ALTER TABLE ... DROP CONSTRAINT is
-- needed.
--
-- Verified on the local database: with all 17 dropped inside a transaction,
-- equality lookups on each leading column still plan as index scans, falling
-- through to the covering composite -- tasks.plan_id to
-- idx_tasks_plan_id_sort_order, plan_output_stream.plan_id to
-- idx_plan_output_stream_created_at, plans.status to
-- idx_plans_status_updated_at, work_artifacts.session_id to
-- uq_work_artifacts_session_type_key, and so on.
--
-- IF EXISTS on every statement keeps this idempotent and safe on a database that
-- never had some of them.

-- Left-prefix duplicates.
DROP INDEX IF EXISTS idx_custom_prompts_file_path;          -- < idx_custom_prompts_file_path_prompt_type
DROP INDEX IF EXISTS idx_custom_prompts_prompt_type;        -- < idx_custom_prompts_type_created_at
DROP INDEX IF EXISTS idx_doc_ingestion_state_scope;         -- < idx_doc_ingestion_state_updated_at
DROP INDEX IF EXISTS idx_documentation_repo;                -- < idx_documentation_repo_sha_path
DROP INDEX IF EXISTS idx_mcp_connector_connections_user_id; -- < uq_mcp_connector_connections_user_key
DROP INDEX IF EXISTS idx_plan_output_stream_plan_id;        -- < idx_plan_output_stream_created_at (plan_id, created_at)
DROP INDEX IF EXISTS idx_plan_tags_plan_id;                 -- < uq_plan_tags_plan_tag
DROP INDEX IF EXISTS idx_plans_status;                      -- < idx_plans_status_updated_at, idx_plans_status_created_at
DROP INDEX IF EXISTS idx_project_skills_project_id;         -- < uq_project_skills_project_slug
DROP INDEX IF EXISTS idx_project_tags_project_id;           -- < uq_project_tags_project_tag
DROP INDEX IF EXISTS idx_task_tags_task_id;                 -- < uq_task_tags_task_tag
DROP INDEX IF EXISTS idx_tasks_plan_id;                     -- < idx_tasks_plan_id_sort_order
DROP INDEX IF EXISTS idx_user_favorite_agent_models_user_id;-- < uq_user_favorite_agent_models_user_backend_model
DROP INDEX IF EXISTS idx_user_skill_tags_user_id;           -- < uq_user_skill_tags_user_tag
DROP INDEX IF EXISTS idx_work_artifacts_session_id;         -- < uq_work_artifacts_session_type_key

-- Same key columns and predicate as a UNIQUE index alongside them.
DROP INDEX IF EXISTS idx_daily_stats_date;                  -- = daily_stats_date_key
DROP INDEX IF EXISTS idx_projects_nx_project_name;          -- = idx_projects_nx_project_name_unique
