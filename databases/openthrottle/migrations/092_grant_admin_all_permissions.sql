-- Backfill the `admin` role with EVERY permission currently defined.
--
-- Migration 034 granted admin all permissions via `CROSS JOIN permissions`, but
-- that was a point-in-time snapshot: it only covered the permissions that existed
-- when 034 ran (settings:*, users:*). Later permission-adding migrations were
-- inconsistent about re-granting admin — 085 (flags:*) did, but
-- 045_seed_service_accounts_bootstrap.sql (plans:read / plans:write) did NOT.
-- Result: on a DB migrated forward from 034, the admin role is missing plans:*,
-- contradicting the RBAC contract that admin is the full superset
-- (@openthrottle/nestjs-rbac ROLE_PERMISSIONS[ADMIN] = Object.values(PERMISSIONS)).
--
-- Re-run the admin CROSS JOIN over the CURRENT permissions table so admin is the
-- full superset again. This backfills plans:read / plans:write on existing DBs and
-- self-heals any other admin drift for permissions added before this migration.
-- Idempotent: ON CONFLICT DO NOTHING, safe to re-apply.
--
-- Going forward, any migration that inserts a new `permissions` row MUST also
-- re-grant it to admin (see databases/README.md, RBAC section).

INSERT INTO
    role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
    CROSS JOIN permissions p
WHERE
    r.name = 'admin'
ON CONFLICT DO NOTHING;
