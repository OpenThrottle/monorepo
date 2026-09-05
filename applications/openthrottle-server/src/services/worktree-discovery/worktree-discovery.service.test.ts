/**
 * @description Unit tests for on-disk worktree discovery: both sources feed the union, a path in
 * both appears once, a symlinked root dedupes against the direct path, a real clone sitting in the
 * root is excluded, git failures degrade to classified problems plus a partial result, and the hard
 * cap reports what it dropped instead of truncating silently.
 *
 * The classification assertions matter as much as the failure ones: the states that are merely the
 * healthy default — above all a repository with no worktrees yet — must produce NOTHING, and each
 * remaining kind must be reported exactly once rather than once per failed probe.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsService,
  UserWorkspaceSettingsService,
} from '@openthrottle/nestjs-repositories';

const { mockExecFile, mockReaddirSync, mockRealpathSync, mockStatSync } =
  vi.hoisted(() => ({
    mockExecFile: vi.fn(),
    mockReaddirSync: vi.fn(),
    mockRealpathSync: vi.fn(),
    mockStatSync: vi.fn(),
  }));

vi.mock('node:child_process', () => ({ execFile: mockExecFile }));
vi.mock('node:fs', () => ({
  readdirSync: mockReaddirSync,
  realpathSync: mockRealpathSync,
  statSync: mockStatSync,
}));

import {
  MAX_DISCOVERED_WORKTREES,
  WorktreeDiscoveryService,
} from './worktree-discovery.service';
import {
  WORKTREE_DISCOVERY_PROBLEM,
  WORKTREE_DISCOVERY_SOURCE,
} from './worktree-discovery.types';

const PRIMARY = '/Users/matt/Development/openthrottle';
/** The default rung of the shared ladder for PRIMARY: `$HOME/worktrees/<repo>`. */
const ROOT = join(homedir(), '.openthrottle', 'worktrees', 'openthrottle');
const USER = 'user-1';

/** Only the fields discovery reads; keeps the mock clear of the `repository` relation. */
type CheckoutOverrides = Partial<
  Pick<RepositoryCheckout, 'filesystemPath' | 'id' | 'kind' | 'repositoryId'>
>;

const checkout = (overrides: CheckoutOverrides = {}): RepositoryCheckout =>
  createMock<RepositoryCheckout>({
    filesystemPath: PRIMARY,
    id: 'checkout-primary',
    kind: 'primary',
    repositoryId: 'repo-1',
    userId: USER,
    ...overrides,
  });

/** Git responses keyed by the first meaningful arg after `-C <cwd>`. */
interface GitScript {
  readonly branch?: string;
  readonly commonDir?: string;
  readonly fail?: ReadonlySet<string>;
  /** Checkout paths that are registered folders but not git repositories. */
  readonly notGitRepos?: readonly string[];
  readonly revList?: string;
  readonly status?: string;
  readonly worktreeList?: string;
}

const scriptGit = (script: GitScript): void => {
  mockExecFile.mockImplementation(
    (
      _file: string,
      args: readonly string[],
      _options: unknown,
      callback: (
        error: Error | null,
        result?: { stderr: string; stdout: string },
      ) => void,
    ) => {
      // args are ['-C', cwd, ...probe]
      const cwd = args[1];
      const probe = args.slice(2);
      const key = probe[0] === 'worktree' ? 'worktree' : probe[0];

      if (script.notGitRepos?.includes(cwd) === true) {
        callback(
          new Error(
            `Command failed: git ${probe.join(' ')}\nfatal: not a git repository (or any of the parent directories): .git\n`,
          ),
        );
        return;
      }

      if (script.fail?.has(key) === true) {
        callback(new Error(`git ${key} exploded`));
        return;
      }

      const stdout = (() => {
        switch (key) {
          case 'branch':
            return script.branch ?? 'openthrottle/wt-a\n';
          case 'rev-list':
            return script.revList ?? '0\n';
          case 'rev-parse':
            return script.commonDir ?? `${PRIMARY}/.git\n`;
          case 'status':
            return script.status ?? '';
          case 'worktree':
            return script.worktreeList ?? `worktree ${PRIMARY}\n`;
          default:
            return '';
        }
      })();

      callback(null, { stderr: '', stdout });
    },
  );
};

/** Every path is its own realpath unless the test maps it elsewhere. */
const withSymlinks = (map: Readonly<Record<string, string>> = {}): void => {
  mockRealpathSync.mockImplementation((value: string) => map[value] ?? value);
};

/** An fs error carrying an errno, the way node throws them — the signal the scan branches on. */
const errnoError = (code: string, text: string): Error =>
  Object.assign(new Error(text), { code });

/** `entries` are the root's children; `directories` are real clones (`.git` is a dir). */
const withRoot = (options: {
  /** Paths that do not exist on disk — e.g. a worktree git still reports after deletion. */
  readonly absent?: readonly string[];
  readonly directories?: readonly string[];
  readonly entries: readonly string[];
  /** The root was never created — the normal state of a repository with no worktrees. */
  readonly missing?: boolean;
  /** The root exists but cannot be read. */
  readonly unreadable?: boolean;
}): void => {
  mockReaddirSync.mockImplementation((path: string) => {
    if (options.missing === true) {
      throw errnoError(
        'ENOENT',
        `ENOENT: no such file or directory, scandir '${path}'`,
      );
    }
    if (options.unreadable === true) {
      throw errnoError(
        'EACCES',
        `EACCES: permission denied, scandir '${path}'`,
      );
    }
    return [...options.entries];
  });

  mockStatSync.mockImplementation((path: string) => {
    const owner = path.endsWith('/.git')
      ? path.slice(0, -'/.git'.length)
      : path;
    if (options.absent?.includes(owner) === true) {
      throw errnoError(
        'ENOENT',
        `ENOENT: no such file or directory, '${path}'`,
      );
    }
    if (path.endsWith('/.git')) {
      const isClone = options.directories?.includes(owner) === true;
      return { isDirectory: () => isClone, isFile: () => !isClone };
    }
    return { isDirectory: () => true, isFile: () => false };
  });
};

/**
 * The root now comes from `OPENTHROTTLE_WORKTREE_ROOT` rather than a settings row, so tests set it the way a
 * user would. `beforeEach` blanks it first: without that these assertions would depend on whatever
 * the developer happens to have in their own `.env`.
 */
const build = (
  checkouts: readonly RepositoryCheckout[],
  worktreeRoot: string | null = null,
): WorktreeDiscoveryService => {
  vi.stubEnv('OPENTHROTTLE_WORKTREE_ROOT', worktreeRoot ?? '');

  return new WorktreeDiscoveryService(
    createMock<LoggerService>(),
    createMock<RepositoryCheckoutsService>({
      listByUserId: vi.fn().mockResolvedValue([...checkouts]),
    }),
    createMock<UserWorkspaceSettingsService>(),
  );
};

describe('WorktreeDiscoveryService', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockReaddirSync.mockReset();
    mockRealpathSync.mockReset();
    mockStatSync.mockReset();
    vi.stubEnv('OPENTHROTTLE_WORKTREE_ROOT', '');
    withSymlinks();
  });

  it('unions both sources and reports which found each worktree', async () => {
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: ['wt-b'] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees.map((worktree) => worktree.path)).toEqual([
      `${ROOT}/wt-a`,
      `${ROOT}/wt-b`,
    ]);
    expect(result.worktrees[0].sources).toEqual([
      WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST,
    ]);
    expect(result.worktrees[1].sources).toEqual([
      WORKTREE_DISCOVERY_SOURCE.ROOT_SCAN,
    ]);
    expect(result.worktreeRoot).toBe(ROOT);
    expect(result.rootSource).toBe('default');
    expect(result.warnings).toEqual([]);
  });

  it('lists a worktree found by both sources exactly once', async () => {
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: ['wt-a'] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toHaveLength(1);
    expect(result.worktrees[0].sources).toEqual([
      WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST,
      WORKTREE_DISCOVERY_SOURCE.ROOT_SCAN,
    ]);
  });

  it('dedupes a symlinked root against the direct path', async () => {
    withSymlinks({ [`/symlinked/wt-a`]: `${ROOT}/wt-a` });
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree /symlinked/wt-a\n`,
    });
    withRoot({ entries: ['wt-a'] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toHaveLength(1);
    expect(result.worktrees[0].path).toBe(`${ROOT}/wt-a`);
  });

  it('excludes a real clone sitting in the worktree root', async () => {
    scriptGit({});
    withRoot({
      directories: [`${ROOT}/a-clone`],
      entries: ['a-clone', 'wt-a'],
    });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees.map((worktree) => worktree.name)).toEqual(['wt-a']);
  });

  it('flags an unregistered worktree and resolves its repository from the common dir', async () => {
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: [] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees[0]).toMatchObject({
      branch: 'openthrottle/wt-a',
      checkoutId: null,
      commonDir: `${PRIMARY}/.git`,
      repositoryId: 'repo-1',
    });
  });

  it('carries the registered checkout id when the path is already registered', async () => {
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: [] });

    const registered = checkout({
      filesystemPath: `${ROOT}/wt-a`,
      id: 'checkout-wt-a',
      kind: 'worktree',
    });

    const result = await build([checkout(), registered]).discover(USER);

    expect(result.worktrees[0].checkoutId).toBe('checkout-wt-a');
  });

  it('reports dirty and ahead signals for classification', async () => {
    scriptGit({
      revList: '3\n',
      status: ' M app/foo.ts\n',
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: [] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees[0]).toMatchObject({ aheadCount: 3, dirty: true });
  });

  it('warns and returns a partial result when a git probe fails', async () => {
    scriptGit({
      fail: new Set(['status']),
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: [] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toHaveLength(1);
    expect(result.worktrees[0].dirty).toBeNull();
    expect(result.warnings.join('\n')).toMatch(/git status --porcelain/);
    expect(result.problems.map((entry) => entry.kind)).toContain(
      WORKTREE_DISCOVERY_PROBLEM.PROBE_FAILED,
    );
  });

  it('says nothing when the root does not exist — a repository with no worktrees is healthy', async () => {
    scriptGit({});
    withRoot({ entries: [], missing: true });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toEqual([]);
    expect(result.problems).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('returns an empty list plus one problem when the root exists but cannot be read', async () => {
    scriptGit({});
    withRoot({ entries: [], unreadable: true });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toEqual([]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatchObject({
      kind: WORKTREE_DISCOVERY_PROBLEM.ROOT_UNREADABLE,
      path: ROOT,
    });
    expect(result.warnings[0]).toMatch(/could not be read/);
  });

  it('reports every resolved root, not just the first', async () => {
    const other = '/Users/someone/code/other';
    scriptGit({});
    mockReaddirSync.mockImplementation((path: string) => {
      if (path === ROOT) return ['wt-a'];
      throw errnoError(
        'ENOENT',
        `ENOENT: no such file or directory, scandir '${path}'`,
      );
    });
    mockStatSync.mockImplementation(() => ({
      isDirectory: () => true,
      isFile: () => true,
    }));

    const result = await build([
      checkout(),
      checkout({
        filesystemPath: other,
        id: 'checkout-other',
        repositoryId: 'repo-other',
      }),
    ]).discover(USER);

    expect(result.scannedRoots).toHaveLength(2);
    expect(result.scannedRoots[0]).toMatchObject({
      exists: true,
      path: ROOT,
      worktreeCount: 1,
    });
    expect(result.scannedRoots[1]).toMatchObject({
      exists: false,
      worktreeCount: 0,
    });
    expect(result.worktreeRoot).toBe(ROOT);
    expect(result.problems).toEqual([]);
  });

  it('prefers OPENTHROTTLE_WORKTREE_ROOT over the default', async () => {
    scriptGit({});
    withRoot({ entries: [] });

    const result = await build([checkout()], '/srv/worktrees').discover(USER);

    expect(result.worktreeRoot).toBe('/srv/worktrees/openthrottle');
    expect(result.rootSource).toBe('env');
    expect(mockReaddirSync).toHaveBeenCalledWith('/srv/worktrees/openthrottle');
  });

  it('reports a deleted worktree git still lists once, and never probes it', async () => {
    const dead = `${ROOT}/wt-dead`;
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${dead}\n`,
    });
    withRoot({ absent: [dead], entries: [] });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toEqual([]);
    expect(result.problems).toEqual([
      {
        detail: expect.any(String),
        kind: WORKTREE_DISCOVERY_PROBLEM.STALE_WORKTREE_ENTRY,
        path: dead,
        repositoryId: null,
      },
    ]);

    const probed = mockExecFile.mock.calls.map((call) => call[1][1]);
    expect(probed).not.toContain(dead);
  });

  it('attributes a registered folder that is not a git repository to its own row', async () => {
    const folder = '/Users/someone/Desktop/example-folder';
    scriptGit({
      notGitRepos: [folder],
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${ROOT}/wt-a\n`,
    });
    withRoot({ entries: [] });

    const result = await build([
      checkout(),
      checkout({
        filesystemPath: folder,
        id: 'checkout-folder',
        repositoryId: 'repo-folder',
      }),
    ]).discover(USER);

    expect(result.problems).toEqual([
      {
        detail: expect.stringContaining('not a git repository'),
        kind: WORKTREE_DISCOVERY_PROBLEM.NOT_A_GIT_REPO,
        path: folder,
        repositoryId: 'repo-folder',
      },
    ]);
    // The other repository's worktrees are unaffected.
    expect(result.worktrees.map((worktree) => worktree.name)).toEqual(['wt-a']);
  });

  it('excludes stale entries from the cap, because they are not worktrees', async () => {
    const dead = `${ROOT}/wt-dead`;
    const names = Array.from(
      { length: MAX_DISCOVERED_WORKTREES },
      (_value, index) => `wt-${String(index).padStart(4, '0')}`,
    );
    scriptGit({
      worktreeList: `worktree ${PRIMARY}\n\nworktree ${dead}\n`,
    });
    withRoot({ absent: [dead], entries: names });

    const result = await build([checkout()]).discover(USER);

    expect(result.droppedCount).toBe(0);
    expect(result.problems.map((entry) => entry.kind)).toEqual([
      WORKTREE_DISCOVERY_PROBLEM.STALE_WORKTREE_ENTRY,
    ]);
  });

  it('derives the deprecated warnings field from the classified problems', async () => {
    scriptGit({});
    withRoot({ entries: [], unreadable: true });

    const result = await build([checkout()]).discover(USER);

    expect(result.warnings).toHaveLength(result.problems.length);
    expect(result.warnings[0]).toContain(ROOT);
    expect(result.warnings[0]).toContain('EACCES');
  });

  it('counts and warns about worktrees dropped by the hard cap', async () => {
    const overflow = 5;
    const names = Array.from(
      { length: MAX_DISCOVERED_WORKTREES + overflow },
      (_value, index) => `wt-${String(index).padStart(4, '0')}`,
    );
    scriptGit({});
    withRoot({ entries: names });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toHaveLength(MAX_DISCOVERED_WORKTREES);
    expect(result.droppedCount).toBe(overflow);
    expect(result.warnings.join('\n')).toMatch(
      new RegExp(`capped at ${MAX_DISCOVERED_WORKTREES}.*${overflow} more`),
    );
    expect(result.problems.map((entry) => entry.kind)).toContain(
      WORKTREE_DISCOVERY_PROBLEM.CAP_EXCEEDED,
    );
  });
});
