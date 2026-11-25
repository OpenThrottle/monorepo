-- Seed the code:read RBAC permission (admin, user, viewer, mcp) for code semantic search.
-- Why: CodeSearchResolver guarded codeSemanticSearch and codeIndexStatus with settings:read,
-- which the mcp role (the openthrottle-mcp service account's role, migration 045) does not hold,
-- so the MCP's code_search tool returned 403 on a stock install (OT plan c731a412). code:read is
-- a narrow permission for reading indexed code, so the MCP gets search without settings:read.
-- indexCodeRepository stays on settings:write. user and viewer keep the access they had through
-- settings:read; admin gets it under the superset contract (databases/README.md, permissions).
-- Keeps the DB in sync with @openthrottle/nestjs-rbac PERMISSIONS (CODE_READ = 'code:read').
-- Applied once via the schema_migrations ledger, and idempotent (ON CONFLICT DO NOTHING).

-- Seed the permission (matches nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'code:read',
        'Search a registered repository''s indexed code and read its index status'
    )
ON CONFLICT (name) DO NOTHING;

-- Grant admin the code read permission (superset contract)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
    AND p.name IN ('code:read')
ON CONFLICT DO NOTHING;

-- Grant the human roles and the mcp service-account role the code read permission
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name IN ('mcp', 'user', 'viewer')
    AND p.name IN ('code:read')
ON CONFLICT DO NOTHING;
