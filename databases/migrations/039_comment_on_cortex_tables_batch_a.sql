-- Batch A (plan c8be6591-7314-4b43-aaa4-6e4b7ab59e59): COMMENT ON TABLE for OpenThrottle tables (≤10 per batch).
-- Tone matches databases/migrations/038_create_plan_runs_table.sql (short purpose-focused prose).

COMMENT ON TABLE commit_links IS 'Links git commits in a repository to OpenThrottle plans and optionally to a specific task for traceability.';
COMMENT ON TABLE custom_prompt_embeddings IS 'Vector embeddings for custom prompt chunks so semantic search can find agents, skills, commands, and rules.';
COMMENT ON TABLE custom_prompts IS 'Stores customizable AI workflow documents such as agents, skills, commands, prompts, and coding rules.';
COMMENT ON TABLE daily_stats IS 'One UTC calendar day of aggregated OpenThrottle activity counts and status rollups for dashboards and reporting.';
COMMENT ON TABLE doc_ingestion_state IS 'Tracks prior content hashes per documentation scope and path so diff-based doc ingestion can detect changes.';
COMMENT ON TABLE documentation IS 'Indexed documentation file snapshots from ingested repositories for search and downstream embedding.';
COMMENT ON TABLE documentation_embeddings IS 'Vector embeddings for documentation chunks enabling semantic search over the docs knowledge base.';
COMMENT ON TABLE notes IS 'Quick unstructured notes from the OpenThrottle MCP for capture separate from structured plans and tasks.';
COMMENT ON TABLE permissions IS 'Named RBAC permission definitions joined to roles for OpenThrottle admin access control.';
COMMENT ON TABLE plan_embeddings IS 'Vector embeddings for plan content chunks used for semantic search over plans.';
