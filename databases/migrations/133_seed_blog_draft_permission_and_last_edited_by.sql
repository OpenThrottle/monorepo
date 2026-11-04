-- Seed the blog:draft RBAC permission (admin + mcp) and add blog_posts.last_edited_by.
-- Why split blog:draft from blog:write: agents draft blog posts through the OT MCP, humans
-- publish. blog:draft covers creating and editing DRAFT posts and reading every post, tag and
-- author (drafts included); blog:write keeps publish / unpublish / archive and the author/tag
-- upserts, and stays admin only (migration 132). Editing or re-tagging a post that is NOT a
-- draft also needs blog:write — that rule depends on the post's status, so the resolver enforces
-- it after loading the post rather than a guard here. The mcp role is the role the
-- openthrottle-mcp service account holds (migration 045), so an agent can draft but nothing it
-- does reaches the public site without a human.
-- Keeps the DB in sync with @openthrottle/nestjs-rbac PERMISSIONS (BLOG_DRAFT = 'blog:draft') and
-- the admin-superset contract (databases/README.md, permissions): admin -> {blog:draft}.
-- Mirrors 132_seed_blog_write_permission.sql. Applied once via the schema_migrations ledger,
-- and still fully idempotent (ON CONFLICT DO NOTHING / IF NOT EXISTS) so a re-run is harmless.

-- Seed the permission (matches nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'blog:draft',
        'Create and edit DRAFT blog posts and read all blog posts, tags and authors'
    )
ON CONFLICT (name) DO NOTHING;

-- Grant admin the blog draft permission (superset contract)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
    AND p.name IN ('blog:draft')
ON CONFLICT DO NOTHING;

-- Grant mcp (the openthrottle-mcp service account's role) the blog draft permission
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'mcp'
    AND p.name IN ('blog:draft')
ON CONFLICT DO NOTHING;

-- Who made the last write to a post
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS last_edited_by TEXT;

COMMENT ON COLUMN blog_posts.last_edited_by IS 'Caller identity of the most recent write to this post: the user''s display name, or the service account''s name for agent writes (e.g. openthrottle-mcp). NULL for rows written before migration 133.';
