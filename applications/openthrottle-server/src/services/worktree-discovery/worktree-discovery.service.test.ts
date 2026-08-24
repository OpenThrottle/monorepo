/**
 * @description Unit tests for on-disk worktree discovery: both sources feed the union, a path in
 * both appears once, a symlinked root dedupes against the direct path, a real clone sitting in the
 * root is excluded, git failures degrade to warnings plus a partial result, and the hard cap warns
 * about what it dropped instead of truncating silently.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
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
import { WORKTREE_DISCOVERY_SOURCE } from './worktree-discovery.types';

const PRIMARY = '/Users/matt/Development/openthrottle';
const ROOT = '/Users/matt/Development/openthrottle-worktrees';
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
      const probe = args.slice(2);
      const key = probe[0] === 'worktree' ? 'worktree' : probe[0];

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

/** `entries` are the root's children; `directories` are real clones (`.git` is a dir). */
const withRoot = (options: {
  readonly directories?: readonly string[];
  readonly entries: readonly string[];
  readonly missing?: boolean;
}): void => {
  mockReaddirSync.mockImplementation((path: string) => {
    if (options.missing === true) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    return [...options.entries];
  });

  mockStatSync.mockImplementation((path: string) => {
    if (path.endsWith('/.git')) {
      const owner = path.slice(0, -'/.git'.length);
      const isClone = options.directories?.includes(owner) === true;
      return { isDirectory: () => isClone, isFile: () => !isClone };
    }
    return { isDirectory: () => true, isFile: () => false };
  });
};

const build = (
  checkouts: readonly RepositoryCheckout[],
  worktreeRoot: string | null = null,
): WorktreeDiscoveryService =>
  new WorktreeDiscoveryService(
    createMock<LoggerService>(),
    createMock<RepositoryCheckoutsService>({
      listByUserId: vi.fn().mockResolvedValue([...checkouts]),
    }),
    createMock<UserWorkspaceSettingsService>({
      getOrCreateForUser: vi.fn().mockResolvedValue({ worktreeRoot }),
    }),
  );

describe('WorktreeDiscoveryService', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockReaddirSync.mockReset();
    mockRealpathSync.mockReset();
    mockStatSync.mockReset();
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
    expect(result.warnings.join('\n')).toMatch(/git status --porcelain failed/);
  });

  it('returns an empty list plus one warning when the root is unreadable', async () => {
    scriptGit({});
    withRoot({ entries: [], missing: true });

    const result = await build([checkout()]).discover(USER);

    expect(result.worktrees).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/could not be read/);
  });

  it('prefers the configured worktree root over the sibling default', async () => {
    scriptGit({});
    withRoot({ entries: [] });

    const result = await build([checkout()], '/srv/worktrees').discover(USER);

    expect(result.worktreeRoot).toBe('/srv/worktrees');
    expect(result.rootSource).toBe('settings');
    expect(mockReaddirSync).toHaveBeenCalledWith('/srv/worktrees');
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
  });
});
