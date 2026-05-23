-- Bootstrap service accounts, automation roles, and Cortex plan permissions (MCP + Ralph workers).
-- Idempotent: safe to re-run after 044_create_service_accounts_tables.sql.
-- Credentials are NOT seeded here (plaintext shown once). Run:
--   pnpm run database:bootstrap-service-accounts

-- Permissions for plans/tasks GraphQL (MCP tools and Ralph workers). No @Permissions on plans resolvers yet;
-- these support CLS/RBAC and future resolver guards.
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
SELECT 'mcp', 'OpenThrottle mcp-developer MCP (plans/tasks GraphQL automation)'
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
SELECT 'mcp-developer', 'Cursor MCP (@openthrottle/mcp-developer) — GraphQL plans/tasks automation'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM service_accounts
        WHERE
            name = 'mcp-developer'
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
    sa.name = 'mcp-developer'
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
