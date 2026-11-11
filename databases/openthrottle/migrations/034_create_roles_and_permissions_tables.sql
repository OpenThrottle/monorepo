-- Roles and permissions for OpenThrottle admin (RBAC).
-- Aligns with @openthrottle/nestjs-rbac (admin, user, viewer; settings:read, settings:write, users:read, users:write).
-- role_permissions: many-to-many roles <-> permissions.
-- user_roles: many-to-many users <-> roles.

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_name ON permissions (name);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name ON roles (name);

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS role_permissions (
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- Seed default permissions (match nestjs-rbac PERMISSIONS)
INSERT INTO
    permissions (id, name, description)
VALUES (
        gen_random_uuid (),
        'settings:read',
        'Read app settings'
    ),
    (
        gen_random_uuid (),
        'settings:write',
        'Change app settings'
    ),
    (
        gen_random_uuid (),
        'users:read',
        'Read user list/details'
    ),
    (
        gen_random_uuid (),
        'users:write',
        'Create/update/delete users'
    )
ON CONFLICT (name) DO NOTHING;

-- Seed default roles (match nestjs-rbac ROLES). Use fixed names so inserts are idempotent.
-- We rely on idx_roles_name unique; insert only if name not present.
INSERT INTO
    roles (id, name, description)
SELECT gen_random_uuid (), 'admin', 'Full access (all permissions)'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE
            name = 'admin'
    );

INSERT INTO
    roles (id, name, description)
SELECT gen_random_uuid (), 'user', 'Read access to settings and users'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE
            name = 'user'
    );

INSERT INTO
    roles (id, name, description)
SELECT gen_random_uuid (), 'viewer', 'Read-only (settings and users)'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE
            name = 'viewer'
    );

-- Assign permissions to admin (all four)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign permissions to user (settings:read, users:read)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'user'
    AND p.name IN ('settings:read', 'users:read')
ON CONFLICT DO NOTHING;

-- Assign permissions to viewer (settings:read, users:read)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'viewer'
    AND p.name IN ('settings:read', 'users:read')
ON CONFLICT DO NOTHING;