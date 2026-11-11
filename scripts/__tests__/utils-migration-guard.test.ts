import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseDefinition } from '../../databases/database-registry.ts';
import { guardSharedMigrations } from '../openthrottle-database-migrations';
import {
  branchMigrationsMessage,
  checkMigrationGuard,
  evaluateMigrationGuard,
  findBranchOnlyMigrations,
  listOriginMainMigrations,
  missingOriginMainMessage,
} from '../utils/migration-guard.ts';

const ON_MAIN = ['001_a.sql', '002_b.sql', 'README.md'];

describe('findBranchOnlyMigrations', () => {
  it('lists local .sql files absent from origin/main, sorted', () => {
    expect(
      findBranchOnlyMigrations(['002_b.sql', '139_z.sql', '138_y.sql', 'notes.md'], ON_MAIN), // prettier-ignore
    ).toEqual(['138_y.sql', '139_z.sql']);
  });

  it('is empty when the branch adds nothing (a newer-main worktree still applies main migrations)', () => {
    expect(findBranchOnlyMigrations(['001_a.sql', '002_b.sql'], ON_MAIN)).toEqual([]); // prettier-ignore
  });
});

describe('evaluateMigrationGuard', () => {
  const localFiles = ['001_a.sql', '002_b.sql', '138_new.sql'];

  it('refuses a shared worktree that adds migrations, with the isolate hint', () => {
    const result = evaluateMigrationGuard({
      localFiles,
      mode: 'shared',
      originMainFiles: ON_MAIN,
    });

    expect(result).toEqual({
      kind: 'refused',
      message: `this branch adds migrations 138_new.sql; a shared-DB worktree cannot apply them. Run \`pnpm worktree:db isolate\`.`,
    });
    expect(branchMigrationsMessage(['a.sql', 'b.sql'])).toContain(
      'a.sql, b.sql',
    );
  });

  it('allows a shared worktree whose migrations are all on origin/main', () => {
    expect(
      evaluateMigrationGuard({
        localFiles: ['001_a.sql'],
        mode: 'shared',
        originMainFiles: ON_MAIN,
      }),
    ).toEqual({ kind: 'allowed' });
  });

  it('fails closed when origin/main cannot be read', () => {
    expect(
      evaluateMigrationGuard({
        localFiles: ['001_a.sql'],
        mode: 'shared',
        originMainFiles: undefined,
      }),
    ).toEqual({ kind: 'refused', message: missingOriginMainMessage() });
    expect(missingOriginMainMessage()).toContain('origin/main');
  });

  it.each(['primary', 'isolated'] as const)(
    'never guards the %s checkout',
    (mode) => {
      expect(
        evaluateMigrationGuard({ localFiles, mode, originMainFiles: ON_MAIN }),
      ).toEqual({ kind: 'allowed' });
      expect(
        evaluateMigrationGuard({
          localFiles,
          mode,
          originMainFiles: undefined,
        }),
      ).toEqual({ kind: 'allowed' });
    },
  );
});

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
};

/** A throwaway repo whose `refs/remotes/origin/main` holds `onMain` under databases/openthrottle/migrations. */
const makeRepo = (onMain: readonly string[], withRef = true): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-migration-guard-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  mkdirSync(join(dir, 'databases/openthrottle/migrations'), {
    recursive: true,
  });

  for (const file of onMain) {
    writeFileSync(
      join(dir, 'databases/openthrottle/migrations', file),
      'SELECT 1;\n',
    );
  }

  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'main');

  if (withRef) {
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  }

  return dir;
};

describe('listOriginMainMigrations / checkMigrationGuard (real git)', () => {
  it('reads the migrations on the local origin/main ref', () => {
    const repo = makeRepo(['001_a.sql', '002_b.sql']);

    expect(listOriginMainMigrations(repo)).toEqual(['001_a.sql', '002_b.sql']);
  });

  it('sees a branch-only migration as absent from origin/main', () => {
    const repo = makeRepo(['001_a.sql']);

    expect(
      checkMigrationGuard({
        cwd: repo,
        localFiles: ['001_a.sql', '099_branch.sql'],
        mode: 'shared',
      }),
    ).toMatchObject({ kind: 'refused' });
  });

  it('fails closed when the origin/main ref is missing', () => {
    const repo = makeRepo(['001_a.sql'], false);

    expect(listOriginMainMigrations(repo)).toBeUndefined();
    expect(
      checkMigrationGuard({ cwd: repo, localFiles: ['001_a.sql'], mode: 'shared' }), // prettier-ignore
    ).toEqual({ kind: 'refused', message: missingOriginMainMessage() });
  });

  it('does not consult git outside shared mode', () => {
    const repo = makeRepo(['001_a.sql'], false);

    expect(
      checkMigrationGuard({ cwd: repo, localFiles: ['099.sql'], mode: 'isolated' }), // prettier-ignore
    ).toEqual({ kind: 'allowed' });
  });
});

describe('listOriginMainMigrations across moved and new databases (real git)', () => {
  /** A repo whose origin/main keeps its migrations under the pre-move `databases/migrations`. */
  const makeLegacyRepo = (onMain: readonly string[]): string => {
    const dir = mkdtempSync(join(tmpdir(), 'ot-migration-guard-legacy-'));
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'test');
    git(dir, 'config', 'commit.gpgsign', 'false');
    mkdirSync(join(dir, 'databases/migrations'), { recursive: true });
    for (const file of onMain) {
      writeFileSync(join(dir, 'databases/migrations', file), 'SELECT 1;\n');
    }
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'main');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    return dir;
  };

  it('falls back to the legacy directory when main has not seen the move yet', () => {
    const repo = makeLegacyRepo(['001_a.sql']);

    expect(listOriginMainMigrations(repo)).toEqual(['001_a.sql']);
    expect(
      checkMigrationGuard({ cwd: repo, localFiles: ['001_a.sql'], mode: 'shared' }), // prettier-ignore
    ).toEqual({ kind: 'allowed' });
  });

  it('treats a database absent from main as all branch-only', () => {
    const repo = makeRepo(['001_a.sql']);

    expect(
      listOriginMainMigrations(repo, 'databases/cms/migrations', []),
    ).toEqual([]);
    expect(
      checkMigrationGuard({
        cwd: repo,
        database: 'cms',
        legacyMigrationsDirs: [],
        localFiles: ['001_create_schemas.sql'],
        migrationsDir: 'databases/cms/migrations',
        mode: 'shared',
      }),
    ).toEqual({
      kind: 'refused',
      message: branchMigrationsMessage(['001_create_schemas.sql'], 'cms'),
    });
  });
});

describe('guardSharedMigrations (the CLI entrypoints share it)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const source = (files: string[]) => {
    return {
      list: async () => files,
      read: async () => '',
    };
  };

  /** Per-database sources: the named database gets `files`, every other one gets none. */
  const sourcesFor = (byDatabase: Readonly<Record<string, string[]>>) => {
    return (database: DatabaseDefinition) => {
      return source(byDatabase[database.name] ?? []);
    };
  };

  it('refuses a shared worktree carrying a branch-only migration before any database work', async () => {
    const repo = makeRepo(['001_a.sql']);
    vi.stubEnv('OT_WORKTREE_DB', 'shared');

    const result = await guardSharedMigrations({
      cwd: repo,
      sourceFor: sourcesFor({ openthrottle: ['001_a.sql', '099_branch.sql'] }),
    });

    expect(result).toEqual({
      kind: 'refused',
      message: `this branch adds migrations to the openthrottle database 099_branch.sql; a shared-DB worktree cannot apply them. Run \`pnpm worktree:db isolate\`.`,
    });
  });

  it('refuses a branch-only migration in a second database', async () => {
    const repo = makeRepo(['001_a.sql']);
    vi.stubEnv('OT_WORKTREE_DB', 'shared');

    const result = await guardSharedMigrations({
      cwd: repo,
      sourceFor: sourcesFor({
        cms: ['001_create_schemas.sql'],
        openthrottle: ['001_a.sql'],
      }),
    });

    expect(result).toEqual({
      kind: 'refused',
      message: branchMigrationsMessage(['001_create_schemas.sql'], 'cms'),
    });
  });

  it('allows a database with no migrations yet', async () => {
    const repo = makeRepo(['001_a.sql']);
    vi.stubEnv('OT_WORKTREE_DB', 'shared');

    await expect(
      guardSharedMigrations({
        cwd: repo,
        sourceFor: sourcesFor({ openthrottle: ['001_a.sql'] }),
      }),
    ).resolves.toEqual({ kind: 'allowed' });
  });

  it('allows the primary (no marker) even with branch-only migrations', async () => {
    const repo = makeRepo(['001_a.sql']);
    vi.stubEnv('OT_WORKTREE_DB', '');

    await expect(
      guardSharedMigrations({
        cwd: repo,
        sourceFor: sourcesFor({
          openthrottle: ['001_a.sql', '099_branch.sql'],
        }),
      }),
    ).resolves.toEqual({ kind: 'allowed' });
  });

  it('allows an isolated worktree', async () => {
    const repo = makeRepo(['001_a.sql'], false);
    vi.stubEnv('OT_WORKTREE_DB', 'isolated');

    await expect(
      guardSharedMigrations({
        cwd: repo,
        sourceFor: sourcesFor({
          openthrottle: ['001_a.sql', '099_branch.sql'],
        }),
      }),
    ).resolves.toEqual({ kind: 'allowed' });
  });
});
