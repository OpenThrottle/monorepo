-- Seed the rollout feature-flag RBAC permissions and role grants.
-- Mirrors 034_create_roles_and_permissions_tables.sql and keeps the DB in sync with
-- @openthrottle/nestjs-rbac PERMISSIONS/ROLE_PERMISSIONS: flags:read / flags:write, granted
-- admin -> {flags:read, flags:write}, user -> flags:read, viewer -> flags:read.
-- Fully idempotent (ON CONFLICT DO NOTHING); the compose runner re-applies every file.

-- Seed the flag permissions (match nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'flags:read',
        'Read feature flags'
    ),
    (
        gen_random_uuid (),
        'flags:write',
        'Create/update/delete feature flags'
    )
ON CONFLICT (name) DO NOTHING;

-- Grant admin both flag permissions
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
    AND p.name IN ('flags:read', 'flags:write')
ON CONFLICT DO NOTHING;

-- Grant user read-only flag access
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'user'
    AND p.name = 'flags:read'
ON CONFLICT DO NOTHING;

-- Grant viewer read-only flag access
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'viewer'
    AND p.name = 'flags:read'
ON CONFLICT DO NOTHING;
