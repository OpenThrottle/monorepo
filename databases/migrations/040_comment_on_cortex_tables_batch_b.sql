-- Batch B (plan c8be6591-7314-4b43-aaa4-6e4b7ab59e59): COMMENT ON TABLE for Cortex tables (≤10 per batch).
-- Tone matches databases/migrations/038_create_plan_runs_table.sql (short purpose-focused prose).
-- plan_runs: table comment already set in 038_create_plan_runs_table.sql; not repeated here.

COMMENT ON TABLE plan_output_stream IS 'Ordered append-only log chunks per plan for agent or Ralph iteration output stored in the database.';
COMMENT ON TABLE plans IS 'Cortex plan records with title, status, category, and author for the plans and tasks knowledge base.';
COMMENT ON TABLE projects IS 'Logical or Nx project groupings that scope plans and tasks within the workspace.';
COMMENT ON TABLE role_permissions IS 'Join of roles to permissions defining which capabilities each RBAC role grants.';
COMMENT ON TABLE roles IS 'Named RBAC roles for OpenThrottle admin access aligned with application permission sets.';
COMMENT ON TABLE subscriptions IS 'Stripe subscription state and billing periods mapped to users for paid entitlements.';
COMMENT ON TABLE task_embeddings IS 'Vector embeddings for task content chunks used for semantic search over tasks.';
COMMENT ON TABLE tasks IS 'Plan-scoped work items with status, requirements, and titles for execution and traceability.';
COMMENT ON TABLE user_roles IS 'Join of users to RBAC roles determining effective admin permissions in the app.';
