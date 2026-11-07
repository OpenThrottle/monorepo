/**
 * @description Unit tests for plan-run worktree teardown: each guard keeps the worktree with its own
 * outcome, a removal goes through `pnpm run worktree:remove` with no --force / --delete-branch, a
 * failing removal is reported rather than thrown, and concurrent teardowns of one path share a run.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRun,
  PlanRunsService,
  RepositoryCheckout,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecFile, mockRealpathSync, mockResolveRoot, mockStatSync } =
  vi.hoisted(() => ({
    mockExecFile: vi.fn(),
    mockRealpathSync: vi.fn(),
    mockResolveRoot: vi.fn(),
    mockStatSync: vi.fn(),
  }));

vi.mock('node:child_process', () => ({ execFile: mockExecFile }));
vi.mock('node:fs', () => ({
  realpathSync: mockRealpathSync,
  statSync: mockStatSync,
}));
vi.mock('../worktree-root/worktree-root.resolver.ts', () => ({
  resolveWorktreeRoot: mockResolveRoot,
}));

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from './plan-run-worktree-teardown.constants.ts';
import { PlanRunWorktreeTeardownService } from './plan-run-worktree-teardown.service.ts';

const BASE = '/Users/matt/Development/openthrottle/monorepo';
const ROOT = '/Users/matt/.openthrottle/worktrees/acme/monorepo';
const WORKTREE = `${ROOT}/plan-c34e018b`;
const BRANCH = 'openthrottle/plan-c34e018b';

interface GitState {
  readonly aheadOfUpstream: string;
  readonly containedInDefault: boolean;
  readonly porcelain: string;
  readonly removeFails: boolean;
  readonly upstream: string | null;
}

const CLEAN_PUSHED: GitState = {
  aheadOfUpstream: '0',
  containedInDefault: false,
  porcelain: '',
  removeFails: false,
  upstream: `origin/${BRANCH}`,
};

type ExecCallback = (
  error: (Error & { code?: number; stderr?: string }) | null,
  result?: { stderr: string; stdout: string },
) => void;

const fail = (callback: ExecCallback, stderr: string): void => {
  callback(Object.assign(new Error(stderr), { code: 1, stderr }));
};

const ok = (callback: ExecCallback, stdout: string): void => {
  callback(null, { stderr: '', stdout });
};

/** Answers git and pnpm calls from one description of the worktree's state. */
const withGit = (state: GitState): void => {
  mockExecFile.mockImplementation(
    (
      file: string,
      args: readonly string[],
      _options: unknown,
      callback: ExecCallback,
    ) => {
      const joined = args.join(' ');
      if (file === 'pnpm') {
        if (joined.startsWith('run worktree:remove') && state.removeFails) {
          fail(callback, 'worktree has uncommitted changes');
          return;
        }
        ok(callback, '');
        return;
      }
      if (joined.endsWith('status --porcelain')) {
        ok(callback, state.porcelain);
        return;
      }
      if (joined.endsWith('--symbolic-full-name @{u}')) {
        if (state.upstream === null) {
          fail(callback, 'fatal: no upstream configured');
          return;
        }
        ok(callback, `${state.upstream}\n`);
        return;
      }
      if (joined.endsWith('rev-list --count @{u}..HEAD')) {
        ok(callback, `${state.aheadOfUpstream}\n`);
        return;
      }
      if (joined.endsWith('symbolic-ref --short refs/remotes/origin/HEAD')) {
        ok(callback, 'origin/main\n');
        return;
      }
      if (joined.includes('merge-base --is-ancestor')) {
        if (state.containedInDefault) ok(callback, '');
        else fail(callback, '');
        return;
      }
      if (joined.endsWith('rev-parse --abbrev-ref HEAD')) {
        ok(callback, `${BRANCH}\n`);
        return;
      }
      fail(callback, `unexpected command: ${file} ${joined}`);
    },
  );
};

/** Paths in `linked` are linked worktrees (`.git` is a file); the base checkout has a `.git` dir. */
const withDisk = (linked: readonly string[]): void => {
  mockStatSync.mockImplementation((path: string) => {
    const owner = path.endsWith('/.git')
      ? path.slice(0, -'/.git'.length)
      : path;
    if (!linked.includes(owner) && owner !== BASE) {
      throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
    }
    const isGitFile = path.endsWith('/.git') && owner !== BASE;
    return {
      isDirectory: () => !isGitFile,
      isFile: () => isGitFile,
    };
  });
};

const checkout = (): RepositoryCheckout => {
  return createMock<RepositoryCheckout>({
    filesystemPath: WORKTREE,
    id: 'checkout-1',
    kind: 'worktree',
    userId: 'user-1',
  });
};

const build = (options: {
  readonly checkouts: readonly RepositoryCheckout[];
  readonly unsettledRuns?: readonly PlanRun[];
}): {
  readonly deleteWorktreeCheckout: ReturnType<typeof vi.fn>;
  readonly service: PlanRunWorktreeTeardownService;
} => {
  const deleteWorktreeCheckout = vi.fn().mockResolvedValue(true);
  const find = vi.fn().mockResolvedValue([...options.checkouts]);

  const service = new PlanRunWorktreeTeardownService(
    createMock<LoggerService>(),
    createMock<RepositoryCheckoutsService>({
      deleteWorktreeCheckout,
      getRepository: vi.fn().mockReturnValue({ find }),
    }),
    createMock<PlanRunsService>({
      findUnsettledRunsByCheckoutIds: vi
        .fn()
        .mockResolvedValue([...(options.unsettledRuns ?? [])]),
    }),
  );
  return { deleteWorktreeCheckout, service };
};

const pnpmCalls = (): string[] => {
  return mockExecFile.mock.calls
    .filter((call) => call[0] === 'pnpm')
    .map((call) => {
      const args: unknown = call[1];
      return Array.isArray(args) ? args.join(' ') : '';
    });
};

describe('PlanRunWorktreeTeardownService', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    mockRealpathSync.mockReset();
    mockRealpathSync.mockImplementation((path: string) => path);
    mockResolveRoot.mockReset();
    mockResolveRoot.mockReturnValue({
      baseRoot: '/Users/matt/.openthrottle/worktrees',
      resolvedRoot: ROOT,
      source: 'default',
    });
    withDisk([WORKTREE]);
  });

  describe('when every guard passes', () => {
    it('stops served processes, removes through worktree:remove and keeps the branch', async () => {
      withGit(CLEAN_PUSHED);
      const { deleteWorktreeCheckout, service } = build({
        checkouts: [checkout()],
      });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result).toEqual({
        branch: BRANCH,
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
        worktreePath: WORKTREE,
      });
      expect(pnpmCalls()).toEqual([
        'run worktree:serve --stop',
        `run worktree:remove ${WORKTREE}`,
      ]);
      const removeCall = mockExecFile.mock.calls.find(
        (call) => call[0] === 'pnpm' && call[1].includes('worktree:remove'),
      );
      expect(removeCall?.[2]).toMatchObject({ cwd: BASE });
      expect(deleteWorktreeCheckout).toHaveBeenCalledWith(
        'user-1',
        'checkout-1',
      );
    });

    it('treats an orphan with no upstream but contained in origin/main as removable', async () => {
      withGit({ ...CLEAN_PUSHED, containedInDefault: true, upstream: null });
      const { service } = build({ checkouts: [] });

      const result = await service.assess({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result.outcome).toBe(PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE);
      expect(pnpmCalls()).toEqual([]);
    });

    it('never passes --force or --delete-branch', async () => {
      withGit(CLEAN_PUSHED);
      const { service } = build({ checkouts: [] });

      await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(pnpmCalls().join(' ')).not.toMatch(/--force|--delete-branch/);
    });
  });

  describe('when the path is the base checkout', () => {
    it('keeps it as KEPT_PRIMARY', async () => {
      withGit(CLEAN_PUSHED);
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: BASE,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_PRIMARY,
      );
      expect(pnpmCalls()).toEqual([]);
    });
  });

  describe('when the path is not a server-provisioned plan-run worktree', () => {
    it('keeps a worktree whose name is not plan-<8 hex>', async () => {
      const handMade = `${ROOT}/loop-plan-0414a40b`;
      withDisk([handMade]);
      withGit(CLEAN_PUSHED);
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: handMade,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_NOT_PLAN_RUN_WORKTREE,
      );
    });

    it('keeps a plan-<8> directory outside the resolved root', async () => {
      const elsewhere = '/tmp/elsewhere/plan-c34e018b';
      withDisk([elsewhere]);
      withGit(CLEAN_PUSHED);
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: elsewhere,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_NOT_PLAN_RUN_WORKTREE,
      );
    });

    it('keeps a path that is not a linked worktree', async () => {
      withDisk([]);
      withGit(CLEAN_PUSHED);
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_NOT_PLAN_RUN_WORKTREE,
      );
    });
  });

  describe('when an unsettled run points at the checkout', () => {
    it('keeps it as KEPT_ACTIVE_RUN', async () => {
      withGit(CLEAN_PUSHED);
      const { service } = build({
        checkouts: [checkout()],
        unsettledRuns: [createMock<PlanRun>({ checkoutId: 'checkout-1' })],
      });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_ACTIVE_RUN,
      );
      expect(pnpmCalls()).toEqual([]);
    });
  });

  describe('when the tree is dirty', () => {
    it('keeps it as KEPT_DIRTY', async () => {
      withGit({ ...CLEAN_PUSHED, porcelain: ' M src/index.ts\n' });
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
      );
    });
  });

  describe('when work is unpushed', () => {
    it('keeps commits ahead of the upstream', async () => {
      withGit({ ...CLEAN_PUSHED, aheadOfUpstream: '2' });
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result.outcome).toBe(
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED,
      );
    });

    it('keeps commits with no upstream that origin/main does not contain', async () => {
      withGit({ ...CLEAN_PUSHED, upstream: null });
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result).toMatchObject({
        detail: expect.stringContaining('no upstream'),
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED,
      });
    });
  });

  describe('when something cannot be evaluated or removed', () => {
    it('reports FAILED when worktree:remove fails, without throwing', async () => {
      withGit({ ...CLEAN_PUSHED, removeFails: true });
      const { deleteWorktreeCheckout, service } = build({
        checkouts: [checkout()],
      });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result).toMatchObject({
        detail: expect.stringContaining('worktree:remove exited 1'),
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
      });
      expect(deleteWorktreeCheckout).not.toHaveBeenCalled();
    });

    it('reports FAILED when the checkout lookup throws', async () => {
      withGit(CLEAN_PUSHED);
      const service = new PlanRunWorktreeTeardownService(
        createMock<LoggerService>(),
        createMock<RepositoryCheckoutsService>({
          getRepository: vi.fn().mockReturnValue({
            find: vi.fn().mockRejectedValue(new Error('db down')),
          }),
        }),
        createMock<PlanRunsService>(),
      );

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result).toMatchObject({
        detail: expect.stringContaining('db down'),
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
      });
      expect(pnpmCalls()).toEqual([]);
    });

    it('still removes when worktree:serve --stop fails', async () => {
      withGit(CLEAN_PUSHED);
      const base = mockExecFile.getMockImplementation();
      mockExecFile.mockImplementation(
        (
          file: string,
          args: readonly string[],
          options: unknown,
          callback: ExecCallback,
        ) => {
          if (file === 'pnpm' && args.includes('worktree:serve')) {
            fail(callback, 'nothing running');
            return;
          }
          base?.(file, args, options, callback);
        },
      );
      const { service } = build({ checkouts: [] });

      const result = await service.teardown({
        baseCheckoutPath: BASE,
        worktreePath: WORKTREE,
      });

      expect(result.outcome).toBe(PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED);
    });
  });

  describe('when two callers tear down the same worktree at once', () => {
    it('shares one removal', async () => {
      withGit(CLEAN_PUSHED);
      const { service } = build({ checkouts: [] });
      const params = { baseCheckoutPath: BASE, worktreePath: WORKTREE };

      const [first, second] = await Promise.all([
        service.teardown(params),
        service.teardown(params),
      ]);

      expect(first).toBe(second);
      expect(
        pnpmCalls().filter((call) => call.includes('worktree:remove')),
      ).toHaveLength(1);
    });
  });
});
