/**
 * @description Unit tests for worktree activity classification: a live IN_PROGRESS run reads
 * RUNNING, the SAME run with an expired heartbeat does not (it falls through to the git-state
 * verdict), dirty and ahead-of-upstream both read DIRTY, clean reads IDLE, a missing upstream is
 * tolerated, and `unregistered` tracks the checkout row independently of activity.
 *
 * The cache block pins the discovery cache: reads inside the TTL share one scan, expiry, `fresh` and
 * `invalidate` each force a rescan, and the live-run lookup is never served from the cache.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRun,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';
import { STALE_CUTOFF_MS } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WORKTREE_DISCOVERY_SOURCE } from '../worktree-discovery/worktree-discovery.constants.ts';
import type { WorktreeDiscoveryService } from '../worktree-discovery/worktree-discovery.service.ts';
import type {
  DiscoveredWorktree,
  WorktreeDiscoveryResult,
} from '../worktree-discovery/worktree-discovery.types.ts';
import {
  DISCOVERY_CACHE_TTL_MS,
  WORKTREE_ACTIVITY,
} from './worktree-activity.constants.ts';
import { WorktreeActivityService } from './worktree-activity.service.ts';

const ROOT = '/Users/matt/Development/openthrottle-worktrees';
const USER = 'user-1';

const worktree = (
  overrides: Partial<DiscoveredWorktree> = {},
): DiscoveredWorktree => {
  return {
    aheadCount: 0,
    branch: 'openthrottle/wt-a',
    checkoutId: 'checkout-wt-a',
    commonDir: '/Users/matt/Development/openthrottle/.git',
    dirty: false,
    name: 'wt-a',
    path: `${ROOT}/wt-a`,
    repositoryId: 'repo-1',
    sources: [WORKTREE_DISCOVERY_SOURCE.ROOT_SCAN],
    ...overrides,
  };
};

const discovery = (
  worktrees: readonly DiscoveredWorktree[],
  warnings: readonly string[] = [],
): WorktreeDiscoveryResult => {
  return {
    droppedCount: 0,
    missingCheckouts: [],
    problems: [],
    rootSource: 'default',
    scannedAt: '2026-08-24T00:00:00.000Z',
    scannedRoots: [],
    warnings,
    worktreeRoot: ROOT,
    worktrees,
  };
};

const run = (overrides: Partial<PlanRun> = {}): PlanRun => {
  return createMock<PlanRun>({
    checkoutId: 'checkout-wt-a',
    id: 'run-1',
    status: 'IN_PROGRESS',
    ...overrides,
  });
};

const build = (options: {
  readonly discovered: WorktreeDiscoveryResult;
  readonly liveRuns?: readonly PlanRun[];
  readonly runsError?: Error;
}): {
  readonly discover: ReturnType<typeof vi.fn>;
  readonly findLiveRunsByCheckoutIds: ReturnType<typeof vi.fn>;
  readonly service: WorktreeActivityService;
} => {
  const liveRuns = [...(options.liveRuns ?? [])];
  const findLiveRunsByCheckoutIds = vi.fn();
  if (options.runsError === undefined) {
    findLiveRunsByCheckoutIds.mockResolvedValue(liveRuns);
  } else {
    findLiveRunsByCheckoutIds.mockRejectedValue(options.runsError);
  }

  const discover = vi.fn().mockResolvedValue(options.discovered);

  return {
    discover,
    findLiveRunsByCheckoutIds,
    service: new WorktreeActivityService(
      createMock<LoggerService>(),
      createMock<WorktreeDiscoveryService>({ discover }),
      createMock<PlanRunsService>({ findLiveRunsByCheckoutIds }),
    ),
  };
};

describe('WorktreeActivityService', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('reads RUNNING and carries the run id when a live run points at the checkout', async () => {
    const { service } = build({
      discovered: discovery([worktree({ dirty: true })]),
      liveRuns: [run()],
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.RUNNING,
      planRunId: 'run-1',
      unregistered: false,
    });
  });

  it('reports runMonitored true for a heartbeating run — RUNNING is a verified fact', async () => {
    const { service } = build({
      discovered: discovery([worktree()]),
      liveRuns: [run({ heartbeatExpected: true })],
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.RUNNING,
      runMonitored: true,
    });
  });

  it('reports runMonitored false for an unsupervised run — RUNNING is only a claim', async () => {
    // The worktree is still held busy, so the activity stays RUNNING; what changes is how
    // much the claim is worth. Without this the UI cannot tell a healthy loop from an agent
    // that died hours ago, and shows both as running.
    const { service } = build({
      discovered: discovery([worktree()]),
      liveRuns: [run({ heartbeatExpected: false })],
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.RUNNING,
      runMonitored: false,
    });
  });

  it('reports runMonitored null when nothing is running', async () => {
    const { service } = build({ discovered: discovery([worktree()]) });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.IDLE,
      runMonitored: null,
    });
  });

  it('asks for liveness with the shared staleness cutoff, not a new number', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:00:00.000Z'));

    const { findLiveRunsByCheckoutIds, service } = build({
      discovered: discovery([worktree()]),
    });

    await service.discoverAndClassify(USER);

    expect(findLiveRunsByCheckoutIds).toHaveBeenCalledWith(
      ['checkout-wt-a'],
      new Date(Date.parse('2026-08-24T12:00:00.000Z') - STALE_CUTOFF_MS),
    );
  });

  it('does NOT read RUNNING when the run is past the cutoff (the query returns nothing)', async () => {
    // A stale IN_PROGRESS row is dead: it never comes back from findLiveRunsByCheckoutIds, so the
    // same worktree falls through to its git-state verdict.
    const { service } = build({
      discovered: discovery([worktree({ dirty: true })]),
      liveRuns: [],
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.DIRTY,
      planRunId: null,
    });
  });

  it('does not read RUNNING for a pending SCHEDULED run — the worktree stays free until it fires', async () => {
    // A scheduled run records its checkout at schedule time, but only IN_PROGRESS runs make a
    // worktree busy and findLiveRunsByCheckoutIds selects IN_PROGRESS only (pinned in
    // plan-runs.service.test.ts), so a worktree with nothing but a SCHEDULED run reads IDLE.
    const { service } = build({
      discovered: discovery([worktree()]),
      liveRuns: [],
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.IDLE,
      planId: null,
      planRunId: null,
      runMonitored: null,
    });
  });

  it('reads DIRTY for uncommitted changes with no live run', async () => {
    const { service } = build({
      discovered: discovery([worktree({ dirty: true })]),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.DIRTY);
  });

  it('reads DIRTY for a clean tree that is ahead of its upstream', async () => {
    const { service } = build({
      discovered: discovery([worktree({ aheadCount: 2, dirty: false })]),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.DIRTY);
  });

  it('reads IDLE for a clean worktree with nothing running', async () => {
    const { service } = build({ discovered: discovery([worktree()]) });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.IDLE);
  });

  it('tolerates a branch with no upstream (aheadCount null)', async () => {
    const { service } = build({
      discovered: discovery([worktree({ aheadCount: null, dirty: false })]),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.IDLE);
  });

  it('flags an unregistered worktree, and never calls it RUNNING', async () => {
    const { findLiveRunsByCheckoutIds, service } = build({
      discovered: discovery([
        worktree({ checkoutId: null, dirty: true, name: 'wt-b' }),
      ]),
      liveRuns: [run()],
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]).toMatchObject({
      activity: WORKTREE_ACTIVITY.DIRTY,
      planRunId: null,
      unregistered: true,
    });
    // No registered checkout ids to ask about, so the query is skipped entirely.
    expect(findLiveRunsByCheckoutIds).not.toHaveBeenCalled();
  });

  it('warns and falls back to git-only classification when plan runs cannot be read', async () => {
    const { service } = build({
      discovered: discovery([worktree({ dirty: true })]),
      runsError: new Error('connection terminated'),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.DIRTY);
    expect(result.warnings.join('\n')).toMatch(
      /could not read live plan runs.*connection terminated/,
    );
  });

  it('passes discovery warnings and the root through untouched', async () => {
    const { service } = build({
      discovered: discovery([worktree()], ['root /nope could not be read']),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.warnings).toEqual(['root /nope could not be read']);
    expect(result).toMatchObject({ rootSource: 'default', worktreeRoot: ROOT });
  });

  describe('discovery cache', () => {
    it('serves a second read inside the TTL from the first scan', async () => {
      vi.useFakeTimers();
      const { discover, service } = build({
        discovered: discovery([worktree()]),
      });

      await service.discoverAndClassify(USER);
      vi.advanceTimersByTime(DISCOVERY_CACHE_TTL_MS - 1);
      await service.discoverAndClassify(USER);

      expect(discover).toHaveBeenCalledTimes(1);
    });

    it('shares one scan between concurrent reads', async () => {
      const { discover, service } = build({
        discovered: discovery([worktree()]),
      });

      await Promise.all([
        service.discoverAndClassify(USER),
        service.discoverAndClassify(USER),
      ]);

      expect(discover).toHaveBeenCalledTimes(1);
    });

    it('rescans once the TTL has passed', async () => {
      vi.useFakeTimers();
      const { discover, service } = build({
        discovered: discovery([worktree()]),
      });

      await service.discoverAndClassify(USER);
      vi.advanceTimersByTime(DISCOVERY_CACHE_TTL_MS);
      await service.discoverAndClassify(USER);

      expect(discover).toHaveBeenCalledTimes(2);
    });

    it('rescans when the caller asks for a fresh scan', async () => {
      const { discover, service } = build({
        discovered: discovery([worktree()]),
      });

      await service.discoverAndClassify(USER);
      await service.discoverAndClassify(USER, { fresh: true });

      expect(discover).toHaveBeenCalledTimes(2);
    });

    it('rescans after invalidate, and only for that user', async () => {
      const { discover, service } = build({
        discovered: discovery([worktree()]),
      });

      await service.discoverAndClassify(USER);
      await service.discoverAndClassify('user-2');
      service.invalidate(USER);
      await service.discoverAndClassify(USER);
      await service.discoverAndClassify('user-2');

      expect(discover.mock.calls.map(([userId]) => userId)).toEqual([
        USER,
        'user-2',
        USER,
      ]);
    });

    it('re-reads live runs on every call, so RUNNING is never served stale', async () => {
      const { discover, findLiveRunsByCheckoutIds, service } = build({
        discovered: discovery([worktree()]),
        liveRuns: [run()],
      });

      const first = await service.discoverAndClassify(USER);
      findLiveRunsByCheckoutIds.mockResolvedValue([]);
      const second = await service.discoverAndClassify(USER);

      expect(discover).toHaveBeenCalledTimes(1);
      expect(findLiveRunsByCheckoutIds).toHaveBeenCalledTimes(2);
      expect(first.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.RUNNING);
      expect(second.worktrees[0]?.activity).toBe(WORKTREE_ACTIVITY.IDLE);
    });

    it('does not keep a failed scan', async () => {
      const { discover, service } = build({
        discovered: discovery([worktree()]),
      });
      discover.mockRejectedValueOnce(new Error('boom'));

      await expect(service.discoverAndClassify(USER)).rejects.toThrow('boom');
      await service.discoverAndClassify(USER);

      expect(discover).toHaveBeenCalledTimes(2);
    });
  });

  describe('memoizeVerdict', () => {
    const scanned = async (): Promise<{
      readonly service: WorktreeActivityService;
    }> => {
      const { service } = build({ discovered: discovery([worktree()]) });
      await service.discoverAndClassify(USER);
      return { service };
    };

    it('computes once per cached scan and reuses the answer', async () => {
      const { service } = await scanned();
      const compute = vi.fn().mockResolvedValue(true);

      await service.memoizeVerdict(USER, 'k', compute);
      await expect(service.memoizeVerdict(USER, 'k', compute)).resolves.toBe(
        true,
      );

      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('keeps keys apart', async () => {
      const { service } = await scanned();
      const compute = vi.fn().mockResolvedValue(false);

      await service.memoizeVerdict(USER, 'a', compute);
      await service.memoizeVerdict(USER, 'b', compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('starts over after invalidate', async () => {
      const { service } = await scanned();
      const compute = vi.fn().mockResolvedValue(true);

      await service.memoizeVerdict(USER, 'k', compute);
      service.invalidate(USER);
      await service.discoverAndClassify(USER);
      await service.memoizeVerdict(USER, 'k', compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('starts over after a fresh scan', async () => {
      const { service } = await scanned();
      const compute = vi.fn().mockResolvedValue(true);

      await service.memoizeVerdict(USER, 'k', compute);
      await service.discoverAndClassify(USER, { fresh: true });
      await service.memoizeVerdict(USER, 'k', compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('starts over once the cached scan has expired', async () => {
      vi.useFakeTimers();
      const { service } = await scanned();
      const compute = vi.fn().mockResolvedValue(true);

      await service.memoizeVerdict(USER, 'k', compute);
      vi.advanceTimersByTime(DISCOVERY_CACHE_TTL_MS);
      await service.memoizeVerdict(USER, 'k', compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('never shares a verdict between users', async () => {
      const { service } = await scanned();
      await service.discoverAndClassify('user-2');
      const compute = vi.fn().mockResolvedValue(true);

      await service.memoizeVerdict(USER, 'k', compute);
      await service.memoizeVerdict('user-2', 'k', compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('just computes when the user has no cached scan', async () => {
      const { service } = build({ discovered: discovery([worktree()]) });
      const compute = vi.fn().mockResolvedValue(true);

      await service.memoizeVerdict(USER, 'k', compute);
      await service.memoizeVerdict(USER, 'k', compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it('does not keep a failed computation', async () => {
      const { service } = await scanned();
      const compute = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue(true);

      await expect(service.memoizeVerdict(USER, 'k', compute)).rejects.toThrow(
        'boom',
      );
      await expect(service.memoizeVerdict(USER, 'k', compute)).resolves.toBe(
        true,
      );
    });
  });
});
