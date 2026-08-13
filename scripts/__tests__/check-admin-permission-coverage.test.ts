import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  adminGrantInStatement,
  findAdminPermissionGaps,
  type MigrationFile,
  permissionsDefinedInStatement,
} from '../check-admin-permission-coverage.ts';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'databases',
  'migrations',
);

const DEFINE_PERMS = `INSERT INTO permissions (name, description) VALUES
  ('plans:read', 'Read plans, tasks, notes'),
  ('plans:write', 'Create and update plans')
ON CONFLICT (name) DO NOTHING`;

const GRANT_ADMIN_BLANKET = `INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.name = 'admin' ON CONFLICT DO NOTHING`;

const GRANT_ADMIN_NAMED = `INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.name = 'admin' AND p.name IN ('plans:read', 'plans:write')
  ON CONFLICT DO NOTHING`;

const GRANT_MCP_NAMED = `INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
  WHERE r.name = 'mcp' AND p.name IN ('plans:read', 'plans:write')
  ON CONFLICT DO NOTHING`;

describe('permissionsDefinedInStatement', () => {
  it('extracts resource:action names from a permissions INSERT', () => {
    expect(permissionsDefinedInStatement(DEFINE_PERMS).sort()).toEqual([
      'plans:read',
      'plans:write',
    ]);
  });

  it('ignores prose descriptions (no colon literal)', () => {
    // The description strings must never be mistaken for permission names.
    expect(permissionsDefinedInStatement(DEFINE_PERMS)).not.toContain(
      'Read plans, tasks, notes',
    );
  });

  it('returns nothing for a role_permissions grant (not a definition)', () => {
    expect(permissionsDefinedInStatement(GRANT_ADMIN_NAMED)).toEqual([]);
  });
});

describe('adminGrantInStatement', () => {
  it('detects a blanket admin CROSS JOIN grant', () => {
    expect(adminGrantInStatement(GRANT_ADMIN_BLANKET)).toEqual({
      blanket: true,
      names: [],
    });
  });

  it('detects an explicit admin p.name IN (...) grant', () => {
    expect(adminGrantInStatement(GRANT_ADMIN_NAMED)).toEqual({
      blanket: false,
      names: ['plans:read', 'plans:write'],
    });
  });

  it('does not treat a non-admin role grant as an admin grant', () => {
    expect(adminGrantInStatement(GRANT_MCP_NAMED)).toBeNull();
  });

  it('returns null for a permissions definition', () => {
    expect(adminGrantInStatement(DEFINE_PERMS)).toBeNull();
  });
});

describe('findAdminPermissionGaps', () => {
  const file = (filename: string, sql: string): MigrationFile => ({
    filename,
    sql,
  });

  it('reports no gaps when a blanket admin grant follows the definition', () => {
    expect(
      findAdminPermissionGaps([
        file('034_perms.sql', `${DEFINE_PERMS}; ${GRANT_ADMIN_BLANKET};`),
      ]),
    ).toEqual([]);
  });

  it('reports no gaps when an explicit admin grant covers the new permission', () => {
    expect(
      findAdminPermissionGaps([
        file('045_perms.sql', `${DEFINE_PERMS}; ${GRANT_ADMIN_NAMED};`),
      ]),
    ).toEqual([]);
  });

  it('flags a permission defined but granted only to a non-admin role (the 045 bug)', () => {
    expect(
      findAdminPermissionGaps([
        file('045_perms.sql', `${DEFINE_PERMS}; ${GRANT_MCP_NAMED};`),
      ]),
    ).toEqual([
      { filename: '045_perms.sql', name: 'plans:read' },
      { filename: '045_perms.sql', name: 'plans:write' },
    ]);
  });

  it('closes the gap when a later blanket backfill grants admin everything (the 092 fix)', () => {
    expect(
      findAdminPermissionGaps([
        file('045_perms.sql', `${DEFINE_PERMS}; ${GRANT_MCP_NAMED};`),
        file('092_backfill.sql', `${GRANT_ADMIN_BLANKET};`),
      ]),
    ).toEqual([]);
  });

  it('does NOT let an EARLIER blanket cover a LATER-defined permission (snapshot semantics)', () => {
    // 092's blanket ran before 099 defined queues:read → still a gap. This is the
    // exact class of bug: blanket grants are point-in-time snapshots.
    expect(
      findAdminPermissionGaps([
        file('092_backfill.sql', `${GRANT_ADMIN_BLANKET};`),
        file(
          '099_queues.sql',
          `INSERT INTO permissions (name) VALUES ('queues:read');`,
        ),
      ]),
    ).toEqual([{ filename: '099_queues.sql', name: 'queues:read' }]);
  });
});

describe('real migrations corpus', () => {
  it('admin is granted every permission defined across databases/migrations', async () => {
    const entries = await readdir(MIGRATIONS_DIR);
    const files = await Promise.all(
      entries
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map(async (filename) => ({
          filename,
          sql: await readFile(join(MIGRATIONS_DIR, filename), 'utf8'),
        })),
    );

    const gaps = findAdminPermissionGaps(files);
    expect(
      gaps,
      `admin is missing permissions: ${gaps
        .map((g) => `${g.name} (${g.filename})`)
        .join(', ')}`,
    ).toEqual([]);
  });

  it('admin explicitly covers plans:read and plans:write', async () => {
    const entries = await readdir(MIGRATIONS_DIR);
    const files = await Promise.all(
      entries
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map(async (filename) => ({
          filename,
          sql: await readFile(join(MIGRATIONS_DIR, filename), 'utf8'),
        })),
    );

    const gapNames = findAdminPermissionGaps(files).map((g) => g.name);
    expect(gapNames).not.toContain('plans:read');
    expect(gapNames).not.toContain('plans:write');
  });
});
