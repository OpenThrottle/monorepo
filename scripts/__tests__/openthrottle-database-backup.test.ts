import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { DATABASES } from '../../databases/database-registry.ts';
import type {
  ComposeProjectRef,
  RunDockerPs,
} from '../openthrottle-database-backup';
import {
  backupsDirFor,
  resolveBackupRetentionCount,
  resolveComposeProject,
  selectBackupsToPrune,
  selectPostgresContainerId,
} from '../openthrottle-database-backup';

interface FakeContainer {
  readonly id: string;
  readonly labels: Readonly<Record<string, string>>;
}

const PRIMARY: ComposeProjectRef = {
  name: 'openthrottle',
  workingDir: '/repo/monorepo',
};

const WORKTREE: ComposeProjectRef = {
  name: 'openthrottle-fix-backup',
  workingDir: '/worktrees/fix-backup',
};

const postgresOf = (id: string, project: ComposeProjectRef): FakeContainer => {
  return {
    id,
    labels: {
      'com.docker.compose.project': project.name,
      'com.docker.compose.project.working_dir': project.workingDir,
      'com.docker.compose.service': 'postgres',
    },
  };
};

/** A `docker ps -q` that applies every `--filter label=k=v` the way docker does (AND). */
const fakeDockerPs = (containers: readonly FakeContainer[]): RunDockerPs => {
  return (args) => {
    const filters = args.flatMap((arg, index) => {
      const value = args[index + 1];

      return arg === '--filter' && value?.startsWith('label=')
        ? [value.slice('label='.length)]
        : [];
    });
    const matches = containers.filter((container) =>
      filters.every((filter) => {
        const separator = filter.indexOf('=');
        const key = filter.slice(0, separator);

        return container.labels[key] === filter.slice(separator + 1);
      }),
    );

    return { status: 0, stdout: matches.map((c) => `${c.id}\n`).join('') };
  };
};

/** A hand-run container with copied project/service labels but no working_dir (seen: `ot-verify-*`). */
const IMPOSTOR: FakeContainer = {
  id: 'verify000001',
  labels: {
    'com.docker.compose.project': 'openthrottle',
    'com.docker.compose.service': 'postgres',
  },
};

/** Several projects each running a `postgres` service, the primary listed LAST. */
const RUNNING = [
  postgresOf('cms000000001', {
    name: 'openthrottle-multi-database-cms',
    workingDir: '/repo/cms',
  }),
  IMPOSTOR,
  postgresOf('worktree0001', WORKTREE),
  postgresOf('primary00001', PRIMARY),
];

const ARCHIVES = [
  'openthrottle-20260101-000000.zip',
  'openthrottle-20260102-000000.zip',
  'openthrottle-20260103-000000.zip',
];

const NON_ARCHIVES = [
  'seed.sql',
  'seed_v0.sql',
  'notes.txt',
  'openthrottle.zip',
];

describe('selectBackupsToPrune', () => {
  test('keeps the N most recent archives and returns the rest to delete', () => {
    const toDelete = selectBackupsToPrune([...ARCHIVES, ...NON_ARCHIVES], 2);

    expect(toDelete).toEqual(['openthrottle-20260101-000000.zip']);
  });

  test('never selects seed files or non-archive files', () => {
    const toDelete = selectBackupsToPrune([...ARCHIVES, ...NON_ARCHIVES], 0);

    for (const name of NON_ARCHIVES) {
      expect(toDelete).not.toContain(name);
    }
    // keep <= 0 prunes every archive (but still nothing else).
    expect(toDelete).toHaveLength(ARCHIVES.length);
  });

  test('returns nothing when the count is within the retention window', () => {
    expect(selectBackupsToPrune(ARCHIVES, 5)).toEqual([]);
  });

  test('prunes one database without touching another database archives', () => {
    const cmsArchives = ['cms-20260101-000000.zip', 'cms-20260102-000000.zip'];
    const listing = [...ARCHIVES, ...cmsArchives];

    expect(selectBackupsToPrune(listing, 1, 'cms')).toEqual([
      'cms-20260101-000000.zip',
    ]);
    expect(selectBackupsToPrune(listing, 1, 'openthrottle')).toEqual([
      'openthrottle-20260102-000000.zip',
      'openthrottle-20260101-000000.zip',
    ]);
  });
});

describe('backupsDirFor', () => {
  test('gives every database its own backups directory', () => {
    expect(
      DATABASES.map((database) => backupsDirFor(database, '/repo')),
    ).toEqual([
      '/repo/databases/openthrottle/backups',
      '/repo/databases/cms/backups',
    ]);
  });
});

describe('resolveBackupRetentionCount', () => {
  test('defaults to 14 when unset, blank, or invalid', () => {
    expect(resolveBackupRetentionCount(undefined)).toBe(14);
    expect(resolveBackupRetentionCount('')).toBe(14);
    expect(resolveBackupRetentionCount('abc')).toBe(14);
    expect(resolveBackupRetentionCount('0')).toBe(14);
    expect(resolveBackupRetentionCount('-3')).toBe(14);
  });

  test('parses a positive integer', () => {
    expect(resolveBackupRetentionCount('7')).toBe(7);
    expect(resolveBackupRetentionCount(' 30 ')).toBe(30);
  });
});

describe('selectPostgresContainerId', () => {
  test('picks the primary container even when other projects are listed first', () => {
    expect(selectPostgresContainerId(PRIMARY, fakeDockerPs(RUNNING))).toBe(
      'primary00001',
    );
  });

  test('picks an isolated worktree’s own container, not the primary', () => {
    expect(selectPostgresContainerId(WORKTREE, fakeDockerPs(RUNNING))).toBe(
      'worktree0001',
    );
  });

  test('returns null rather than another project when this one has no postgres', () => {
    expect(
      selectPostgresContainerId(
        'openthrottle-shared-wt',
        fakeDockerPs(RUNNING),
      ),
    ).toBeNull();
  });

  test('ignores a non-postgres service of the same project', () => {
    const redis: FakeContainer = {
      id: 'redis0000001',
      labels: {
        'com.docker.compose.project': PRIMARY.name,
        'com.docker.compose.project.working_dir': PRIMARY.workingDir,
        'com.docker.compose.service': 'redis',
      },
    };

    expect(
      selectPostgresContainerId(PRIMARY, fakeDockerPs([redis])),
    ).toBeNull();
  });

  test('never takes a lookalike without this checkout’s working_dir', () => {
    expect(
      selectPostgresContainerId(PRIMARY, fakeDockerPs([IMPOSTOR])),
    ).toBeNull();
  });

  test('returns null when docker fails', () => {
    const failing: RunDockerPs = () => {
      return { status: 1, stdout: 'primary00001\n' };
    };

    expect(selectPostgresContainerId(PRIMARY, failing)).toBeNull();
  });
});

describe('resolveComposeProject', () => {
  const makeRoot = (files: Readonly<Record<string, string>>): string => {
    const root = mkdtempSync(join(tmpdir(), 'ot-backup-project-'));

    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(root, name), contents);
    }

    return root;
  };

  test('uses the compose file name for the primary (no COMPOSE_PROJECT_NAME)', () => {
    const root = makeRoot({ 'docker-compose.yml': "name: 'OpenThrottle'\n" });

    expect(resolveComposeProject(root, {})).toBe('openthrottle');
  });

  test('uses the worktree .env COMPOSE_PROJECT_NAME over the compose file name', () => {
    const root = makeRoot({
      '.env': 'COMPOSE_PROJECT_NAME=openthrottle-fix-backup\n',
      'docker-compose.yml': "name: 'OpenThrottle'\n",
    });

    expect(resolveComposeProject(root, {})).toBe('openthrottle-fix-backup');
  });

  test('lets the process env override the .env file', () => {
    const root = makeRoot({
      '.env': 'COMPOSE_PROJECT_NAME=openthrottle-fix-backup\n',
      'docker-compose.yml': "name: 'OpenThrottle'\n",
    });

    expect(
      resolveComposeProject(root, { COMPOSE_PROJECT_NAME: 'Other_Project' }),
    ).toBe('other_project');
  });
});
