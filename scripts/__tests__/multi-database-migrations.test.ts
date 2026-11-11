import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { DatabaseDefinition } from '../../databases/database-registry.ts';
import {
  databaseNameOf,
  DATABASES,
  findDatabase,
  isValidDatabaseName,
  parseDatabaseFlag,
  primaryDatabase,
  resolveDatabaseUrl,
  selectDatabases,
  withDatabaseName,
} from '../../databases/database-registry.ts';
import type {
  DatabaseAdminClient,
  DatabaseMigrator,
  MigrationRunResult,
} from '../../databases/migration-runner.ts';
import {
  CORE_TABLES,
  createFsMigrationSource,
  ensureDatabaseExists,
  migrateDatabases,
  RETIRED_MIGRATIONS,
} from '../../databases/migration-runner.ts';
import {
  changedMigrationPaths,
  migrationDiffArgs,
} from '../utils/migration-diff.ts';

const PRIMARY_URL = 'postgresql://user:p%40ss@db.local:5432/openthrottle';

const EMPTY_RESULT: MigrationRunResult = {
  applied: [],
  cutOver: false,
  skipped: [],
};

const cms = (): DatabaseDefinition => {
  const found = findDatabase('cms');
  if (!found) throw new Error('cms is not registered');
  return found;
};

describe('database registry', () => {
  test('lists openthrottle first as the only primary, then cms', () => {
    expect(DATABASES.map((database) => database.name)).toEqual([
      'openthrottle',
      'cms',
    ]);
    expect(DATABASES.filter((database) => database.primary)).toHaveLength(1);
    expect(primaryDatabase().name).toBe('openthrottle');
  });

  test('keeps the primary core tables and retired set on the runner exports', () => {
    expect(CORE_TABLES).toEqual(['plans', 'tasks']);
    expect([...RETIRED_MIGRATIONS]).toEqual([
      '010_normalize_author_to_visormatt.sql',
      '013_normalize_assignee_to_visormatt.sql',
    ]);
  });

  test('gives every database its own migrations directory', () => {
    const paths = DATABASES.map((database) => database.migrationsPath);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('resolveDatabaseUrl', () => {
  test('uses the primary URL unchanged for the primary', () => {
    expect(resolveDatabaseUrl(primaryDatabase(), PRIMARY_URL, {})).toBe(
      PRIMARY_URL,
    );
  });

  test('derives cms from the primary URL, keeping host and credentials', () => {
    expect(resolveDatabaseUrl(cms(), PRIMARY_URL, {})).toBe(
      'postgresql://user:p%40ss@db.local:5432/cms',
    );
  });

  test('takes the database name from CMS_POSTGRES_DB', () => {
    const url = resolveDatabaseUrl(cms(), PRIMARY_URL, {
      CMS_POSTGRES_DB: ' cms_dev ',
    });
    expect(databaseNameOf(url)).toBe('cms_dev');
  });

  test('prefers CMS_POSTGRES_URL over everything else', () => {
    expect(
      resolveDatabaseUrl(cms(), PRIMARY_URL, {
        CMS_POSTGRES_DB: 'ignored',
        CMS_POSTGRES_URL: 'postgresql://other:5432/elsewhere',
      }),
    ).toBe('postgresql://other:5432/elsewhere');
  });
});

describe('URL and name helpers', () => {
  test('withDatabaseName swaps only the path', () => {
    expect(withDatabaseName(`${PRIMARY_URL}?sslmode=require`, 'postgres')).toBe(
      'postgresql://user:p%40ss@db.local:5432/postgres?sslmode=require',
    );
  });

  test('isValidDatabaseName accepts lowercase identifiers only', () => {
    expect(isValidDatabaseName('cms')).toBe(true);
    expect(isValidDatabaseName('cms_2')).toBe(true);
    expect(isValidDatabaseName('CMS')).toBe(false);
    expect(isValidDatabaseName('cms"; DROP')).toBe(false);
    expect(isValidDatabaseName('')).toBe(false);
  });
});

describe('parseDatabaseFlag / selectDatabases', () => {
  test('reads both flag spellings', () => {
    expect(parseDatabaseFlag(['--database', 'cms'])).toBe('cms');
    expect(parseDatabaseFlag(['--', '--database=cms'])).toBe('cms');
    expect(parseDatabaseFlag(['--database'])).toBe('');
  });

  test('selects every database when the flag is absent', () => {
    expect(parseDatabaseFlag([])).toBeUndefined();
    expect(selectDatabases(undefined)).toBe(DATABASES);
  });

  test('selects one database, or nothing for an unknown name', () => {
    expect(selectDatabases('cms')?.map((database) => database.name)).toEqual([
      'cms',
    ]);
    expect(selectDatabases('nope')).toBeUndefined();
  });
});

/** A fake admin connection: `existing` names the databases the server already has. */
const fakeAdmin = (
  existing: readonly string[],
  createError: unknown = undefined,
): DatabaseAdminClient & { readonly statements: string[] } => {
  const statements: string[] = [];

  return {
    query: async (text, values) => {
      statements.push(text);
      if (text.startsWith('SELECT')) {
        const name = values?.[0];
        return { rowCount: existing.some((db) => db === name) ? 1 : 0 };
      }
      if (createError !== undefined) throw createError;
      return { rowCount: null };
    },
    statements,
  };
};

describe('ensureDatabaseExists', () => {
  test('creates a missing database', async () => {
    const admin = fakeAdmin([]);

    await expect(ensureDatabaseExists(admin, 'cms')).resolves.toBe(true);
    expect(admin.statements).toContain('CREATE DATABASE "cms"');
  });

  test('leaves an existing database alone', async () => {
    const admin = fakeAdmin(['cms']);

    await expect(ensureDatabaseExists(admin, 'cms')).resolves.toBe(false);
    expect(admin.statements).toHaveLength(1);
  });

  test('treats losing a creation race (42P04) as existing', async () => {
    const admin = fakeAdmin([], { code: '42P04' });

    await expect(ensureDatabaseExists(admin, 'cms')).resolves.toBe(false);
  });

  test('rethrows any other creation error', async () => {
    const admin = fakeAdmin([], { code: '42501' });

    await expect(ensureDatabaseExists(admin, 'cms')).rejects.toEqual({
      code: '42501',
    });
  });

  test('refuses a name that is not a plain identifier', async () => {
    const admin = fakeAdmin([]);

    await expect(ensureDatabaseExists(admin, 'Bad-Name')).rejects.toThrow(
      /lowercase identifiers/,
    );
    expect(admin.statements).toHaveLength(0);
  });
});

/** A fake migrator recording calls; `failOn` makes that database's migrate throw. */
const fakeMigrator = (
  failOn: string | undefined = undefined,
): DatabaseMigrator & { readonly calls: string[] } => {
  const calls: string[] = [];

  return {
    calls,
    ensureDatabase: async (adminUrl, url) => {
      calls.push(`ensure ${databaseNameOf(adminUrl)}->${databaseNameOf(url)}`);
      return true;
    },
    migrate: async (database, url) => {
      calls.push(`migrate ${database.name}@${databaseNameOf(url)}`);
      if (database.name === failOn) throw new Error(`boom ${database.name}`);
      return EMPTY_RESULT;
    },
  };
};

describe('migrateDatabases', () => {
  test('migrates in order, creating only non-primary databases', async () => {
    const migrator = fakeMigrator();

    const outcomes = await migrateDatabases({
      databases: DATABASES,
      env: {},
      log: () => {},
      migrator,
      primaryUrl: PRIMARY_URL,
    });

    expect(migrator.calls).toEqual([
      'migrate openthrottle@openthrottle',
      'ensure openthrottle->cms',
      'migrate cms@cms',
    ]);
    expect(outcomes).toEqual([
      { created: false, database: 'openthrottle', result: EMPTY_RESULT },
      { created: true, database: 'cms', result: EMPTY_RESULT },
    ]);
  });

  test('stops at the first failing database', async () => {
    const migrator = fakeMigrator('openthrottle');

    await expect(
      migrateDatabases({
        databases: DATABASES,
        env: {},
        log: () => {},
        migrator,
        primaryUrl: PRIMARY_URL,
      }),
    ).rejects.toThrow('boom openthrottle');
    expect(migrator.calls).toEqual(['migrate openthrottle@openthrottle']);
  });

  test('migrates just the selected database', async () => {
    const migrator = fakeMigrator();

    await migrateDatabases({
      databases: [cms()],
      env: { CMS_POSTGRES_DB: 'cms_test' },
      log: () => {},
      migrator,
      primaryUrl: PRIMARY_URL,
    });

    expect(migrator.calls).toEqual([
      'ensure openthrottle->cms_test',
      'migrate cms@cms_test',
    ]);
  });
});

describe('createFsMigrationSource', () => {
  test('lists a missing directory as empty, so a new database still gets its ledger', async () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'ot-mig-')), 'absent');

    await expect(createFsMigrationSource(dir).list()).resolves.toEqual([]);
  });
});

describe('changedMigrationPaths', () => {
  test('drops pure renames and deletions, keeps adds, edits and edited renames', () => {
    const nameStatus = [
      'R100\tdatabases/migrations/001_a.sql\tdatabases/openthrottle/migrations/001_a.sql',
      'R087\tdatabases/migrations/002_b.sql\tdatabases/openthrottle/migrations/002_b.sql',
      'A\tdatabases/cms/migrations/001_create_schemas.sql',
      'M\tdatabases/openthrottle/migrations/150_x.sql',
      'D\tdatabases/openthrottle/migrations/151_gone.sql',
      'A\tdatabases/cms/migrations/.gitkeep',
      '',
    ].join('\n');

    expect(changedMigrationPaths(nameStatus)).toEqual([
      'databases/openthrottle/migrations/002_b.sql',
      'databases/cms/migrations/001_create_schemas.sql',
      'databases/openthrottle/migrations/150_x.sql',
    ]);
  });

  test('scopes the diff to every directory, so a move pairs as a rename', () => {
    expect(
      migrationDiffArgs('abc...HEAD', [
        'databases/openthrottle/migrations',
        'databases/migrations',
      ]),
    ).toEqual([
      'diff',
      '--name-status',
      '-M',
      'abc...HEAD',
      '--',
      'databases/openthrottle/migrations/',
      'databases/migrations/',
    ]);
  });
});
