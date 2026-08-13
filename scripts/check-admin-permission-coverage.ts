#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @description Enforces the RBAC invariant that the `admin` role is the full permission
 * superset in the DB seed, mirroring @openthrottle/nestjs-rbac
 * `ROLE_PERMISSIONS[ADMIN] = Object.values(PERMISSIONS)`
 * (packages/nestjs-rbac/src/roles.ts).
 *
 * The bug this guards against: migration 034 grants admin every permission via a
 * `CROSS JOIN permissions` — but that is a point-in-time snapshot. When a later
 * migration inserts a NEW permission it must ALSO re-grant it to admin (as 085 did
 * for flags:*). Migration 045 added plans:read/plans:write and forgot to, so admin
 * silently lost coverage on any DB migrated forward from 034 (fixed by 092).
 *
 * This check parses databases/migrations/*.sql statically (no DB needed) and fails if
 * any permission defined by a migration is never granted to admin by an equal-or-later
 * migration — either by an explicit `p.name IN (...)` grant or a blanket
 * `CROSS JOIN permissions WHERE r.name = 'admin'`. Note a blanket grant only covers
 * permissions DEFINED UP TO the migration it appears in; permissions added afterwards
 * need their own admin grant.
 */

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'databases',
  'migrations',
);

/** Global matcher for permission-name string literals inside a SQL fragment. */
const PERMISSION_LITERAL = /'([a-z][a-z_]*:[a-z][a-z_]*)'/g;

export interface MigrationFile {
  readonly filename: string;
  readonly sql: string;
}

/** A permission defined by a migration, with the file that defined it. */
export interface DefinedPermission {
  readonly filename: string;
  readonly name: string;
}

/** Split SQL into individual statements. The migration corpus has no `;` inside literals. */
const statements = (sql: string): string[] =>
  sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

const permissionLiterals = (fragment: string): string[] => {
  const names = new Set<string>();
  for (const [, name] of fragment.matchAll(PERMISSION_LITERAL)) names.add(name);
  return [...names];
};

/**
 * @description Permission names DEFINED by a statement — i.e. inserted into the
 * `permissions` table. Grants (`role_permissions`) are ignored here.
 */
export const permissionsDefinedInStatement = (statement: string): string[] =>
  /insert\s+into\s+permissions\b/i.test(statement)
    ? permissionLiterals(statement)
    : [];

/**
 * @description How a statement grants the `admin` role. `blanket` = a
 * `CROSS JOIN permissions` grant covering every permission defined so far; `names`
 * = an explicit `p.name IN (...)` list. Returns null when the statement does not
 * grant admin (wrong table, or a different role).
 */
export const adminGrantInStatement = (
  statement: string,
): { blanket: boolean; names: string[] } | null => {
  if (!/insert\s+into\s+role_permissions\b/i.test(statement)) return null;
  if (!/r\.name\s*=\s*'admin'/i.test(statement)) return null;

  const inList = statement.match(/p\.name\s+in\s*\(([^)]*)\)/i);
  if (inList) return { blanket: false, names: permissionLiterals(inList[1]) };

  if (/cross\s+join\s+permissions\b/i.test(statement)) {
    return { blanket: true, names: [] };
  }
  return null;
};

/**
 * @description Pure coverage check. Given migration files (any order), returns the
 * permissions that are defined but never granted to admin by an equal-or-later
 * migration. An empty array means admin is the full superset.
 */
export const findAdminPermissionGaps = (
  files: readonly MigrationFile[],
): DefinedPermission[] => {
  const ordered = [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );

  const definedBy = new Map<string, string>();
  const grantedToAdmin = new Set<string>();

  for (const { filename, sql } of ordered) {
    const stmts = statements(sql);
    // Defs first, so a define + blanket-grant within the SAME file both take effect
    // regardless of statement order.
    for (const stmt of stmts) {
      for (const name of permissionsDefinedInStatement(stmt)) {
        if (!definedBy.has(name)) definedBy.set(name, filename);
      }
    }
    for (const stmt of stmts) {
      const grant = adminGrantInStatement(stmt);
      if (!grant) continue;
      if (grant.blanket) {
        for (const name of definedBy.keys()) grantedToAdmin.add(name);
      } else {
        for (const name of grant.names) grantedToAdmin.add(name);
      }
    }
  }

  return [...definedBy]
    .filter(([name]) => !grantedToAdmin.has(name))
    .map(([name, filename]) => ({ filename, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const readMigrations = async (): Promise<MigrationFile[]> => {
  const entries = await readdir(MIGRATIONS_DIR);
  const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort();
  return Promise.all(
    sqlFiles.map(async (filename) => ({
      filename,
      sql: await readFile(join(MIGRATIONS_DIR, filename), 'utf8'),
    })),
  );
};

async function main(): Promise<void> {
  const gaps = findAdminPermissionGaps(await readMigrations());

  if (gaps.length > 0) {
    console.error(
      '❌ Permissions defined by a migration but never granted to the admin role:\n',
    );
    for (const { filename, name } of gaps) {
      console.error(`  ${name} (defined in ${filename})`);
    }
    console.error(
      `\n${gaps.length} uncovered permission(s). Any migration that INSERTs into ` +
        `permissions must also grant the new permission to admin (see 085 for the ` +
        `pattern; databases/README.md § RBAC). admin must stay the full superset.`,
    );
    process.exit(1);
  }

  console.log('✅ admin role covers every defined permission.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
