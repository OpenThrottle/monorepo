-- Bootstrap service accounts, automation roles, and OpenThrottle plan permissions (MCP + Ralph workers).
-- Idempotent: safe to re-run after 044_create_service_accounts_tables.sql.
-- Credentials are NOT seeded here (plaintext shown once). Run:
--   pnpm run database:bootstrap-service-accounts

-- Permissions for plans/tasks GraphQL (MCP tools and Ralph workers). No @Permissions on plans resolvers yet;
-- these support CLS/RBAC and future resolver guards.
-- GOTCHA (fixed in 092): this migration grants plans:* ONLY to the mcp/workflow-ralph roles and did NOT
-- re-grant admin. Migration 034's admin `CROSS JOIN permissions` is a point-in-time snapshot and does not
-- pick up permissions added later, so admin silently lacked plans:read/plans:write on DBs migrated forward
-- from 034. Any future permission-adding migration MUST also grant admin (see databases/README.md § RBAC and
-- the check:rbac-admin-coverage gate). 092_grant_admin_all_permissions.sql backfills the historical gap.
INSERT INTO
    permissions (name, description)
VALUES (
        'plans:read',
        'Read plans, tasks, notes, semantic search, activity, and output stream'
    ),
    (
        'plans:write',
        'Create and update plans, tasks, notes, output stream, and commit links'
    )
ON CONFLICT (name) DO NOTHING;

INSERT INTO
    roles (name, description)
SELECT 'mcp', 'OpenThrottle openthrottle-mcp MCP (plans/tasks GraphQL automation)'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE
            name = 'mcp'
    );

INSERT INTO
    roles (name, description)
SELECT 'workflow-ralph', 'BullMQ / workflow-ralph worker GraphQL identity'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE
            name = 'workflow-ralph'
    );

INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'mcp'
    AND p.name IN ('plans:read', 'plans:write')
ON CONFLICT DO NOTHING;

INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'workflow-ralph'
    AND p.name IN ('plans:read', 'plans:write')
ON CONFLICT DO NOTHING;

INSERT INTO
    service_accounts (name, description)
SELECT 'openthrottle-mcp', 'Cursor MCP (@openthrottle/openthrottle-mcp) — GraphQL plans/tasks automation'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'openthrottle-mcp'
    );

INSERT INTO
    service_accounts (name, description)
SELECT 'workflow-ralph', 'Plans queue / workflow-ralph — GraphQL for Ralph orchestration and task updates'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'workflow-ralph'
    );

INSERT INTO
    service_account_roles (service_account_id, role_id)
SELECT sa.id, r.id
FROM service_accounts sa
    CROSS JOIN roles r
WHERE
    sa.name = 'openthrottle-mcp'
    AND r.name = 'mcp'
ON CONFLICT DO NOTHING;

INSERT INTO
    service_account_roles (service_account_id, role_id)
SELECT sa.id, r.id
FROM service_accounts sa
    CROSS JOIN roles r
WHERE
    sa.name = 'workflow-ralph'
    AND r.name = 'workflow-ralph'
ON CONFLICT DO NOTHING;
