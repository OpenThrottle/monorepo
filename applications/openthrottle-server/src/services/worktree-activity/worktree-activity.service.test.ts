/**
 * @description Unit tests for worktree activity classification: a live IN_PROGRESS run reads
 * RUNNING, the SAME run with an expired heartbeat does not (it falls through to the git-state
 * verdict), dirty and ahead-of-upstream both read DIRTY, clean reads IDLE, a missing upstream is
 * tolerated, and `unregistered` tracks the checkout row independently of activity.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  STALE_CUTOFF_MS,
} from '@openthrottle/nestjs-repositories';
import { WorktreeDiscoveryService } from '../worktree-discovery/worktree-discovery.service';
import type {
  DiscoveredWorktree,
  WorktreeDiscoveryResult,
} from '../worktree-discovery/worktree-discovery.types';
import { WORKTREE_DISCOVERY_SOURCE } from '../worktree-discovery/worktree-discovery.types';
import { WorktreeActivityService } from './worktree-activity.service';
import { WORKTREE_ACTIVITY } from './worktree-activity.types';

const ROOT = '/Users/matt/Development/openthrottle-worktrees';
const USER = 'user-1';

const worktree = (
  overrides: Partial<DiscoveredWorktree> = {},
): DiscoveredWorktree => ({
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
});

const discovery = (
  worktrees: readonly DiscoveredWorktree[],
  warnings: readonly string[] = [],
): WorktreeDiscoveryResult => ({
  droppedCount: 0,
  problems: [],
  rootSource: 'default',
  scannedAt: '2026-08-24T00:00:00.000Z',
  scannedRoots: [],
  warnings,
  worktreeRoot: ROOT,
  worktrees,
});

const run = (overrides: Partial<PlanRun> = {}): PlanRun =>
  createMock<PlanRun>({
    checkoutId: 'checkout-wt-a',
    id: 'run-1',
    status: 'IN_PROGRESS',
    ...overrides,
  });

const build = (options: {
  readonly discovered: WorktreeDiscoveryResult;
  readonly liveRuns?: readonly PlanRun[];
  readonly runsError?: Error;
}): {
  readonly findLiveRunsByCheckoutIds: ReturnType<typeof vi.fn>;
  readonly service: WorktreeActivityService;
} => {
  const findLiveRunsByCheckoutIds =
    options.runsError === undefined
      ? vi.fn().mockResolvedValue([...(options.liveRuns ?? [])])
      : vi.fn().mockRejectedValue(options.runsError);

  return {
    findLiveRunsByCheckoutIds,
    service: new WorktreeActivityService(
      createMock<LoggerService>(),
      createMock<WorktreeDiscoveryService>({
        discover: vi.fn().mockResolvedValue(options.discovered),
      }),
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

  it('reads DIRTY for uncommitted changes with no live run', async () => {
    const { service } = build({
      discovered: discovery([worktree({ dirty: true })]),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0].activity).toBe(WORKTREE_ACTIVITY.DIRTY);
  });

  it('reads DIRTY for a clean tree that is ahead of its upstream', async () => {
    const { service } = build({
      discovered: discovery([worktree({ aheadCount: 2, dirty: false })]),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0].activity).toBe(WORKTREE_ACTIVITY.DIRTY);
  });

  it('reads IDLE for a clean worktree with nothing running', async () => {
    const { service } = build({ discovered: discovery([worktree()]) });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0].activity).toBe(WORKTREE_ACTIVITY.IDLE);
  });

  it('tolerates a branch with no upstream (aheadCount null)', async () => {
    const { service } = build({
      discovered: discovery([worktree({ aheadCount: null, dirty: false })]),
    });

    const result = await service.discoverAndClassify(USER);

    expect(result.worktrees[0].activity).toBe(WORKTREE_ACTIVITY.IDLE);
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

    expect(result.worktrees[0].activity).toBe(WORKTREE_ACTIVITY.DIRTY);
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
});
