-- Batch A (plan 9c361abb-7c3a-4cf7-94d5-eb3ad06b0c49): COMMENT ON TABLE backfill for tables from 042 and 044.
-- Tone matches databases/migrations/038_create_plan_runs_table.sql (short purpose-focused prose; OpenThrottle wording).

COMMENT ON TABLE user_workspace_settings IS 'Per-user workspace profile: contact fields and enabled editor preferences for the developer UI.';
COMMENT ON TABLE workspace_local_repositories IS 'Local filesystem checkout paths registered by a user, optionally linked to an OpenThrottle project.';
COMMENT ON TABLE service_accounts IS 'Named service identities for system-to-system auth (MCP, CI, and Ralph workers).';
COMMENT ON TABLE service_account_credentials IS 'Hashed bearer credentials for service accounts; stores prefix and secret hash only, never the raw secret.';
COMMENT ON TABLE service_account_roles IS 'Join of service accounts to RBAC roles defining effective permissions for machine identities.';
