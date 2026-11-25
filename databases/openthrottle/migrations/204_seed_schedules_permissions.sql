-- Seed the schedules:read and schedules:write RBAC permissions for the agent scheduled-job operations.
-- Why: the scheduledAgentJobsAsAgent query and the four …AsAgent mutations behind the openthrottle-mcp
-- scheduling tools were gated on settings:read / settings:write, which the mcp role (the
-- openthrottle-mcp service account's role, migration 045) does not hold, so every scheduling tool
-- returned 403 on a stock install (OT plan 12f0c806). These narrow permissions let the MCP manage
-- its own jobs without settings:write; the UI's scheduled-job operations stay on settings:*.
-- user keeps the access it had through settings:*, viewer keeps read only, and admin gets both under
-- the superset contract (databases/openthrottle/README.md, permissions).
-- Keeps the DB in sync with @openthrottle/nestjs-rbac PERMISSIONS (SCHEDULES_READ, SCHEDULES_WRITE).
-- Applied once via the schema_migrations ledger, and idempotent (ON CONFLICT DO NOTHING).

-- Seed the permissions (match nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'schedules:read',
        'List the caller''s scheduled agent jobs through the agent operations'
    ),
    (
        gen_random_uuid (),
        'schedules:write',
        'Create, update, delete and run-now scheduled agent jobs through the agent operations'
    )
ON CONFLICT (name) DO NOTHING;

-- Grant admin both schedules permissions (superset contract)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
    AND p.name IN ('schedules:read', 'schedules:write')
ON CONFLICT DO NOTHING;

-- Grant the mcp service-account role and the user role both schedules permissions
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name IN ('mcp', 'user')
    AND p.name IN ('schedules:read', 'schedules:write')
ON CONFLICT DO NOTHING;

-- Grant the viewer role read only
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'viewer'
    AND p.name IN ('schedules:read')
ON CONFLICT DO NOTHING;
