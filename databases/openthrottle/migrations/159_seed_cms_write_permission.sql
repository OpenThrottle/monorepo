-- Seed the cms:write RBAC permission and grant it to admin.
-- Why a dedicated permission: the cms GraphQL mutations (fragments, their edges, layouts, library
-- components) change content the openthrottle-cms app renders publicly. No existing permission
-- describes cms content, and reusing settings:write would hand every `user` role holder the
-- ability to publish. cms:write is therefore admin-only, as blog:write is; there is no cms:read,
-- because the cms read queries are public.
-- Keeps the DB in sync with @openthrottle/nestjs-rbac PERMISSIONS (CMS_WRITE = 'cms:write') and
-- the admin-superset contract (databases/README.md, permissions). Mirrors
-- 132_seed_blog_write_permission.sql. Idempotent (ON CONFLICT DO NOTHING).

-- Seed the permission (matches nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'cms:write',
        'Create, update and delete cms content: fragments and their edges, layouts, library components'
    )
ON CONFLICT (name) DO NOTHING;

-- Grant admin the cms write permission
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
    AND p.name IN ('cms:write')
ON CONFLICT DO NOTHING;
