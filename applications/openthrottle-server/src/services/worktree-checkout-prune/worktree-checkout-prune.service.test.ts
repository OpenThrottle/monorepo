/**
 * @description Unit tests for the guarded worktree checkout prune: one outcome per requested id,
 * each guard re-checked server-side, and nothing deleted unless every guard passed.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import type {
  PlanRun,
  PlanRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { WorktreeRemovalsRepository } from '@openthrottle/nestjs-repositories-server';
import type { WorktreeRemovalsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlanRunsRepositoryMock,
  createWorktreeRemovalsRepositoryMock,
  worktreeRemovalsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRealpathSync, mockStatSync } = vi.hoisted(() => ({
  mockRealpathSync: vi.fn(),
  mockStatSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  realpathSync: mockRealpathSync,
  statSync: mockStatSync,
}));

import { MAX_PRUNE_CHECKOUT_IDS } from './worktree-checkout-prune.constants.ts';
import { PRUNE_WORKTREE_CHECKOUT_OUTCOME } from './worktree-checkout-prune.constants.ts';
import { WorktreeCheckoutPruneService } from './worktree-checkout-prune.service.ts';

const USER = 'user-1';
const ROOT = '/Users/matt/.openthrottle/worktrees/acme/monorepo';

const worktree = (name: string): RepositoryCheckout => {
  return createMock<RepositoryCheckout>({
    filesystemPath: `${ROOT}/${name}`,
    id: `checkout-${name}`,
    kind: 'worktree',
    repositoryId: 'repo-1',
    userId: USER,
  });
};

/** Paths listed in `live` are linked worktrees (`.git` is a file); everything else is gone. */
const withDisk = (live: readonly string[]): void => {
  mockStatSync.mockImplementation((path: string) => {
    const owner = path.endsWith('/.git')
      ? path.slice(0, -'/.git'.length)
      : path;
    if (!live.includes(owner)) {
      throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
    }
    return {
      isDirectory: () => !path.endsWith('/.git'),
      isFile: () => path.endsWith('/.git'),
    };
  });
};

const build = (options: {
  readonly checkouts: readonly RepositoryCheckout[];
  readonly deleted?: boolean;
  readonly recordFails?: boolean;
  readonly unsettledRuns?: readonly PlanRun[];
}): {
  readonly deleteWorktreeCheckout: ReturnType<typeof vi.fn>;
  readonly record: WorktreeRemovalsRepositoryMock['record'];
  readonly service: WorktreeCheckoutPruneService;
} => {
  const removals = createWorktreeRemovalsRepositoryMock();
  const { record } = removals;
  if (options.recordFails) {
    record.mockRejectedValue(new Error('db down'));
  } else {
    record.mockResolvedValue(worktreeRemovalsFactory.build());
  }
  const deleteWorktreeCheckout = vi
    .fn()
    .mockResolvedValue(options.deleted ?? true);
  const byId = new Map(options.checkouts.map((entry) => [entry.id, entry]));
  const byPath = new Map(
    options.checkouts.map((entry) => [entry.filesystemPath, entry]),
  );

  const planRunsRepository = createPlanRunsRepositoryMock();
  planRunsRepository.findUnsettledRunsByCheckoutIds.mockResolvedValue([
    ...(options.unsettledRuns ?? []),
  ]);

  const service = new WorktreeCheckoutPruneService(
    createMock<LoggerService>(),
    createMock<RepositoryCheckoutsService>({
      deleteWorktreeCheckout,
      findByIdForUser: vi.fn((id: string) =>
        Promise.resolve(byId.get(id) ?? null),
      ),
      findByUserAndPath: vi.fn((_userId: string, path: string) =>
        Promise.resolve(byPath.get(path) ?? null),
      ),
    }),
    createMock<PlanRunsRepository>(planRunsRepository),
    createMock<WorktreeRemovalsRepository>(removals),
  );

  return { deleteWorktreeCheckout, record, service };
};

describe('WorktreeCheckoutPruneService', () => {
  beforeEach(() => {
    mockRealpathSync.mockReset();
    mockStatSync.mockReset();
    mockRealpathSync.mockImplementation((value: string) => value);
    withDisk([]);
  });

  describe('when the worktree is gone and nothing references it', () => {
    it('deletes the row and reports PRUNED with its path', async () => {
      const gone = worktree('wt-gone');
      const { deleteWorktreeCheckout, service } = build({ checkouts: [gone] });

      const results = await service.pruneByIds(USER, [gone.id]);

      expect(results).toEqual([
        {
          checkoutId: gone.id,
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED,
          path: gone.filesystemPath,
        },
      ]);
      expect(deleteWorktreeCheckout).toHaveBeenCalledWith(USER, gone.id);
    });
  });

  describe('when the path is still a live worktree', () => {
    it('refuses with SKIPPED_LIVE, whatever the client believed', async () => {
      const live = worktree('wt-live');
      withDisk([live.filesystemPath]);
      const { deleteWorktreeCheckout, service } = build({ checkouts: [live] });

      const [result] = await service.pruneByIds(USER, [live.id]);

      expect(result?.outcome).toBe(
        PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_LIVE,
      );
      expect(deleteWorktreeCheckout).not.toHaveBeenCalled();
    });
  });

  describe('when an unsettled run points at the checkout', () => {
    it('refuses with SKIPPED_ACTIVE_RUN even though the path is gone', async () => {
      const busy = worktree('wt-busy');
      const { deleteWorktreeCheckout, service } = build({
        checkouts: [busy],
        unsettledRuns: [createMock<PlanRun>({ checkoutId: busy.id })],
      });

      const [result] = await service.pruneByIds(USER, [busy.id]);

      expect(result?.outcome).toBe(
        PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_ACTIVE_RUN,
      );
      expect(deleteWorktreeCheckout).not.toHaveBeenCalled();
    });

    it('answers SKIPPED_ACTIVE_RUN, not SKIPPED_LIVE, while the worktree is still on disk', async () => {
      // destroy.sh's pre-removal probe depends on this order: asked on a live path, the run guard
      // must speak first, or the script could not tell "in use" from "merely present".
      const busy = worktree('wt-busy-live');
      withDisk([busy.filesystemPath]);
      const { deleteWorktreeCheckout, service } = build({
        checkouts: [busy],
        unsettledRuns: [createMock<PlanRun>({ checkoutId: busy.id })],
      });

      const result = await service.deregisterByPath(
        USER,
        busy.filesystemPath,
        null,
      );

      expect(result.outcome).toBe(
        PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_ACTIVE_RUN,
      );
      expect(deleteWorktreeCheckout).not.toHaveBeenCalled();
    });
  });

  describe('when only a SCHEDULED run points at the checkout', () => {
    it('does not hold the worktree: the unsettled-run guard asks for QUEUED/IN_PROGRESS, not SCHEDULED', async () => {
      // A scheduled run records its checkout at schedule time but holds nothing until it fires.
      // findUnsettledRunsByCheckoutIds excludes SCHEDULED by construction (pinned in
      // plan-runs.service.test.ts), so here it comes back empty and the prune proceeds.
      const free = worktree('wt-scheduled');
      const { deleteWorktreeCheckout, service } = build({
        checkouts: [free],
        unsettledRuns: [],
      });

      const [result] = await service.pruneByIds(USER, [free.id]);

      expect(result?.outcome).toBe(PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED);
      expect(deleteWorktreeCheckout).toHaveBeenCalledWith(USER, free.id);
    });
  });

  describe('when the checkout is a primary', () => {
    it('never deletes it', async () => {
      const primary = createMock<RepositoryCheckout>({
        filesystemPath: '/Users/matt/Development/openthrottle',
        id: 'checkout-primary',
        kind: 'primary',
        userId: USER,
      });
      const { deleteWorktreeCheckout, service } = build({
        checkouts: [primary],
      });

      const [result] = await service.pruneByIds(USER, [primary.id]);

      expect(result?.outcome).toBe(
        PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_PRIMARY,
      );
      expect(deleteWorktreeCheckout).not.toHaveBeenCalled();
    });
  });

  describe('when the id is unknown or not owned by the caller', () => {
    it('reports NOT_FOUND with no path', async () => {
      const { service } = build({ checkouts: [] });

      await expect(service.pruneByIds(USER, ['nope'])).resolves.toEqual([
        {
          checkoutId: 'nope',
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
          path: null,
        },
      ]);
    });

    it('reports NOT_FOUND when the row vanished between the read and the delete', async () => {
      const raced = worktree('wt-raced');
      const { service } = build({ checkouts: [raced], deleted: false });

      const [result] = await service.pruneByIds(USER, [raced.id]);

      expect(result?.outcome).toBe(PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND);
    });
  });

  it('reports one outcome per distinct id, in request order', async () => {
    const gone = worktree('wt-gone');
    const live = worktree('wt-live');
    withDisk([live.filesystemPath]);
    const { service } = build({ checkouts: [gone, live] });

    const results = await service.pruneByIds(USER, [live.id, gone.id, live.id]);

    expect(results.map((entry) => [entry.checkoutId, entry.outcome])).toEqual([
      [live.id, PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_LIVE],
      [gone.id, PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED],
    ]);
  });

  it('rejects a request over the cap before reading anything', async () => {
    const { service } = build({ checkouts: [] });
    const ids = Array.from(
      { length: MAX_PRUNE_CHECKOUT_IDS + 1 },
      (_value, index) => `id-${index}`,
    );

    await expect(service.pruneByIds(USER, ids)).rejects.toThrow(/at most 200/);
  });

  describe('deregisterByPath', () => {
    describe('when a worktree checkout is registered at the removed path', () => {
      it('prunes it through the same guards and reports its id', async () => {
        const gone = worktree('wt-gone');
        const { deleteWorktreeCheckout, service } = build({
          checkouts: [gone],
        });

        await expect(
          service.deregisterByPath(USER, gone.filesystemPath, null),
        ).resolves.toEqual({
          checkoutId: gone.id,
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED,
          path: gone.filesystemPath,
        });
        expect(deleteWorktreeCheckout).toHaveBeenCalledWith(USER, gone.id);
      });

      it('matches the registration by real path when the caller passed a symlinked one', async () => {
        const gone = worktree('wt-gone');
        mockRealpathSync.mockImplementation((value: string) =>
          value === '/symlinked/wt-gone' ? gone.filesystemPath : value,
        );
        const { service } = build({ checkouts: [gone] });

        const result = await service.deregisterByPath(
          USER,
          '/symlinked/wt-gone',
          null,
        );

        expect(result.checkoutId).toBe(gone.id);
      });

      it('keeps it while an unsettled run still points at it', async () => {
        const busy = worktree('wt-busy');
        const { deleteWorktreeCheckout, service } = build({
          checkouts: [busy],
          unsettledRuns: [createMock<PlanRun>({ checkoutId: busy.id })],
        });

        const result = await service.deregisterByPath(
          USER,
          busy.filesystemPath,
          null,
        );

        expect(result.outcome).toBe(
          PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_ACTIVE_RUN,
        );
        expect(deleteWorktreeCheckout).not.toHaveBeenCalled();
      });
    });

    describe('when nothing is registered at the path', () => {
      it('reports NOT_FOUND with no checkout id', async () => {
        const { service } = build({ checkouts: [] });

        await expect(
          service.deregisterByPath(USER, `${ROOT}/never-registered`, null),
        ).resolves.toEqual({
          checkoutId: null,
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
          path: `${ROOT}/never-registered`,
        });
      });
    });
  });

  describe('deregisterByPath with a removal audit', () => {
    const audit = {
      agentSession: 'session-1',
      ancestry: '10 pnpm worktree:remove',
      branch: 'feat/x',
      parent: 'sh destroy.sh',
      pid: 42,
      ppid: 41,
      probe: 'NOT_FOUND',
      result: 'removed',
      ts: '2026-11-15T17:00:00Z',
    };

    describe('when a checkout was registered and pruned', () => {
      it('records the audit with the checkout, repository and outcome', async () => {
        const gone = worktree('wt-audited');
        const { record, service } = build({ checkouts: [gone] });

        const result = await service.deregisterByPath(
          USER,
          gone.filesystemPath,
          audit,
        );

        expect(result.outcome).toBe(PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED);
        expect(record).toHaveBeenCalledWith({
          agentSession: 'session-1',
          ancestry: '10 pnpm worktree:remove',
          branch: 'feat/x',
          checkoutId: gone.id,
          filesystemPath: gone.filesystemPath,
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED,
          parentCommand: 'sh destroy.sh',
          pid: 42,
          ppid: 41,
          probe: 'NOT_FOUND',
          removedAt: new Date('2026-11-15T17:00:00Z'),
          repositoryId: 'repo-1',
          result: 'removed',
          userId: USER,
        });
      });
    });

    describe('when nothing was registered at the path', () => {
      it('still records the removal, with no checkout or repository', async () => {
        const { record, service } = build({ checkouts: [] });
        const path = `${ROOT}/never-registered`;

        await service.deregisterByPath(USER, path, audit);

        expect(record).toHaveBeenCalledWith(
          expect.objectContaining({
            checkoutId: null,
            filesystemPath: path,
            outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
            repositoryId: null,
          }),
        );
      });
    });

    describe('when recording fails', () => {
      it('returns the prune result anyway', async () => {
        const gone = worktree('wt-record-fails');
        const { service } = build({ checkouts: [gone], recordFails: true });

        await expect(
          service.deregisterByPath(USER, gone.filesystemPath, audit),
        ).resolves.toEqual({
          checkoutId: gone.id,
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED,
          path: gone.filesystemPath,
        });
      });
    });

    describe('when no audit was sent', () => {
      it('records nothing', async () => {
        const gone = worktree('wt-probe');
        const { record, service } = build({ checkouts: [gone] });

        await service.deregisterByPath(USER, gone.filesystemPath, null);

        expect(record).not.toHaveBeenCalled();
      });
    });
  });
});
