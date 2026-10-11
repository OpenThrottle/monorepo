-- Seed the blog:write RBAC permission and grant it to admin.
-- Why a dedicated permission: the blog write API (create/update/publish/archive posts, set post
-- tags, upsert authors and tags) publishes content to the PUBLIC marketing site. None of the
-- existing permissions (settings:*, users:*, plans:*, flags:*) describe blog content, and reusing
-- settings:write would hand every `user` role holder (it carries settings:write) the ability to
-- publish to the public site. blog:write is therefore held by admin only; there is deliberately
-- no blog:read, because the public read queries are unauthenticated.
-- Keeps the DB in sync with @openthrottle/nestjs-rbac PERMISSIONS (BLOG_WRITE = 'blog:write') and
-- the admin-superset contract (databases/README.md, permissions): admin -> {blog:write}.
-- Mirrors 085_seed_rollout_flag_permissions.sql. Fully idempotent (ON CONFLICT DO NOTHING); the
-- compose runner re-applies every file.

-- Seed the permission (matches nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'blog:write',
        'Create, update, publish and archive blog posts, authors and tags'
    )
ON CONFLICT (name) DO NOTHING;

-- Grant admin the blog write permission
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
    AND p.name IN ('blog:write')
ON CONFLICT DO NOTHING;
