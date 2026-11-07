/**
 * @description Unit tests for the plan-run worktree reaper. The snapshot test mirrors the on-disk
 * state the plan was filed against: of six plan-run worktrees, exactly the two with a merged/closed
 * PR and the clean orphan are removed; the dirty and unpushed ones are nominated or not, but never
 * removed.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlanRunsService,
  PlansService,
  RepositoryCheckout,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecFile } = vi.hoisted(() => ({ mockExecFile: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile: mockExecFile }));

import type { NotificationsService } from '../../notifications/notifications.service.ts';
import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import type { PlanRunWorktreeTeardownService } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import type {
  PlanRunWorktreeAssessment,
  PlanRunWorktreeTeardownResult,
  TeardownPlanRunWorktreeParams,
} from '../plan-run-worktree-teardown/plan-run-worktree-teardown.types.ts';
import type { WorktreeDiscoveryService } from '../worktree-discovery/worktree-discovery.service.ts';
import type {
  DiscoveredWorktree,
  WorktreeDiscoveryResult,
} from '../worktree-discovery/worktree-discovery.types.ts';
import { PLAN_RUN_WORKTREE_NOMINATION } from './plan-run-worktree-reaper.constants.ts';
import { PlanRunWorktreeReaperService } from './plan-run-worktree-reaper.service.ts';

const PRIMARY = '/Users/matt/Development/openthrottle/monorepo';
const ROOT = '/Users/matt/.openthrottle/worktrees/OpenThrottle/monorepo';
const NOW = new Date('2026-11-20T00:00:00.000Z');
const LONG_AGO = new Date('2026-11-01T00:00:00.000Z');
const RECENT = new Date('2026-11-19T00:00:00.000Z');

/** One fixture worktree: what discovery, gh, git, the plans table and teardown say about it. */
interface Fixture {
  readonly name: string;
  readonly plan: { readonly status: string; readonly updatedAt: Date } | null;
  readonly prState: 'CLOSED' | 'MERGED' | 'OPEN' | null;
  readonly teardown: 'kept-dirty' | 'kept-unpushed' | 'removed';
  readonly workBeyondDefault: boolean;
}

const pathOf = (name: string): string => {
  return `${ROOT}/${name}`;
};

/** The six plan-run worktrees on disk when the plan was filed (2026-11-06). */
const SNAPSHOT: readonly Fixture[] = [
  {
    name: 'plan-c34e018b',
    plan: { status: 'COMPLETED', updatedAt: RECENT },
    prState: 'MERGED',
    teardown: 'removed',
    workBeyondDefault: true,
  },
  {
    name: 'plan-49d72fc4',
    plan: { status: 'COMPLETED', updatedAt: RECENT },
    prState: 'CLOSED',
    teardown: 'removed',
    workBeyondDefault: true,
  },
  {
    // Clean, 0 commits ahead, no upstream, and its plan is gone: an orphan.
    name: 'plan-3e68abb9',
    plan: null,
    prState: null,
    teardown: 'removed',
    workBeyondDefault: false,
  },
  {
    // Clean but 6 unpushed commits: nominated as terminal + idle, kept by the unpushed guard.
    name: 'plan-855c5007',
    plan: { status: 'COMPLETED', updatedAt: LONG_AGO },
    prState: null,
    teardown: 'kept-unpushed',
    workBeyondDefault: true,
  },
  {
    // Dirty + unpushed and still in progress: never nominated.
    name: 'plan-0b6dfaf8',
    plan: { status: 'IN_PROGRESS', updatedAt: RECENT },
    prState: 'OPEN',
    teardown: 'kept-dirty',
    workBeyondDefault: true,
  },
  {
    // Dirty + unpushed, terminal and idle: nominated, kept by the dirty guard.
    name: 'plan-5aad07f6',
    plan: { status: 'COMPLETED', updatedAt: LONG_AGO },
    prState: null,
    teardown: 'kept-dirty',
    workBeyondDefault: true,
  },
];

const discovered = (name: string): DiscoveredWorktree => {
  return createMock<DiscoveredWorktree>({
    branch: `openthrottle/${name}`,
    commonDir: `${PRIMARY}/.git`,
    name,
    path: pathOf(name),
  });
};

const fixtureForPath = (
  fixtures: readonly Fixture[],
  path: string,
): Fixture | undefined => {
  return fixtures.find((fixture) => pathOf(fixture.name) === path);
};

type ExecCallback = (
  error: (Error & { code?: number }) | null,
  result?: { stderr: string; stdout: string },
) => void;

/** Answers `gh pr view` and the git probes from the fixtures. */
const withCommands = (fixtures: readonly Fixture[]): void => {
  mockExecFile.mockImplementation(
    (
      file: string,
      args: readonly string[],
      options: { readonly cwd: string },
      callback: ExecCallback,
    ) => {
      const fixture = fixtureForPath(fixtures, options.cwd);
      const joined = args.join(' ');
      if (file === 'gh') {
        if (fixture?.prState == null) {
          callback(
            Object.assign(new Error('no pull requests found'), { code: 1 }),
          );
          return;
        }
        callback(null, { stderr: '', stdout: `${fixture.prState}\n` });
        return;
      }
      if (joined.includes('symbolic-ref')) {
        callback(null, { stderr: '', stdout: 'origin/main\n' });
        return;
      }
      if (joined.includes('rev-list --count')) {
        const ahead = fixture?.workBeyondDefault === false ? '0' : '3';
        callback(null, { stderr: '', stdout: `${ahead}\n` });
        return;
      }
      callback(Object.assign(new Error(`unexpected: ${joined}`), { code: 1 }));
    },
  );
};

const plansFor = (fixtures: readonly Fixture[], options: unknown): Plan[] => {
  const match = /"prefix":"([0-9a-f]{8})%"/.exec(JSON.stringify(options));
  const prefix = match?.[1];
  const fixture = fixtures.find((entry) => entry.name === `plan-${prefix}`);
  if (fixture?.plan == null) return [];
  return [
    createMock<Plan>({
      id: `${prefix}-0000-4000-8000-000000000000`,
      status: fixture.plan.status,
      updatedAt: fixture.plan.updatedAt,
    }),
  ];
};

const verdictFor = (
  fixtures: readonly Fixture[],
  params: TeardownPlanRunWorktreeParams,
): PlanRunWorktreeTeardownResult => {
  const fixture = fixtureForPath(fixtures, params.worktreePath);
  if (fixture?.teardown === 'kept-dirty') {
    return {
      detail: 'it has uncommitted changes',
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
      worktreePath: params.worktreePath,
    };
  }
  if (fixture?.teardown === 'kept-unpushed') {
    return {
      detail: 'it has commits that are not pushed',
      outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED,
      worktreePath: params.worktreePath,
    };
  }
  return {
    branch: null,
    outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
    worktreePath: params.worktreePath,
  };
};

const assessmentFor = (
  fixtures: readonly Fixture[],
  params: TeardownPlanRunWorktreeParams,
): PlanRunWorktreeAssessment => {
  const verdict = verdictFor(fixtures, params);
  if (verdict.outcome !== PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED) {
    return verdict;
  }
  return {
    branch: null,
    outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE,
    worktreePath: params.worktreePath,
  };
};

const build = (
  fixtures: readonly Fixture[],
  extraWorktrees: readonly DiscoveredWorktree[] = [],
): {
  readonly assess: ReturnType<typeof vi.fn>;
  readonly emitSystemAlert: ReturnType<typeof vi.fn>;
  readonly service: PlanRunWorktreeReaperService;
  readonly teardown: ReturnType<typeof vi.fn>;
} => {
  withCommands(fixtures);
  const teardown = vi.fn(async (params: TeardownPlanRunWorktreeParams) =>
    verdictFor(fixtures, params),
  );
  const assess = vi.fn(async (params: TeardownPlanRunWorktreeParams) =>
    assessmentFor(fixtures, params),
  );
  const emitSystemAlert = vi.fn();
  const worktrees = [
    ...fixtures.map((fixture) => discovered(fixture.name)),
    ...extraWorktrees,
  ];

  const service = new PlanRunWorktreeReaperService(
    createMock<LoggerService>(),
    createMock<RepositoryCheckoutsService>({
      findAll: vi
        .fn()
        .mockResolvedValue([
          createMock<RepositoryCheckout>({ userId: 'user-1' }),
          createMock<RepositoryCheckout>({ userId: 'user-1' }),
        ]),
    }),
    createMock<WorktreeDiscoveryService>({
      discover: vi
        .fn()
        .mockResolvedValue(createMock<WorktreeDiscoveryResult>({ worktrees })),
    }),
    createMock<NotificationsService>({ emitSystemAlert }),
    createMock<PlanRunsService>({
      findRecentByPlanId: vi.fn().mockResolvedValue([]),
    }),
    createMock<PlansService>({
      getRepository: vi.fn().mockReturnValue({
        find: vi.fn(async (options: unknown) => plansFor(fixtures, options)),
      }),
    }),
    createMock<PlanRunWorktreeTeardownService>({ assess, teardown }),
  );
  return { assess, emitSystemAlert, service, teardown };
};

const removedPaths = (
  summary: Awaited<ReturnType<PlanRunWorktreeReaperService['sweep']>>,
): string[] => {
  return summary.nominated
    .filter(
      (entry) =>
        entry.verdict.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
    )
    .map((entry) => entry.candidate.worktreePath)
    .sort();
};

describe('PlanRunWorktreeReaperService', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
  });

  describe('against the filing snapshot (live)', () => {
    it('removes exactly the merged-PR, closed-PR and orphan worktrees', async () => {
      const { service } = build(SNAPSHOT);

      const summary = await service.sweep({ dryRun: false, now: NOW });

      expect(removedPaths(summary)).toEqual(
        [
          pathOf('plan-3e68abb9'),
          pathOf('plan-49d72fc4'),
          pathOf('plan-c34e018b'),
        ].sort(),
      );
      expect(summary.removed).toBe(3);
      expect(summary.examined).toBe(6);
    });

    it('nominates each removable worktree for the right reason', async () => {
      const { service } = build(SNAPSHOT);

      const summary = await service.sweep({ dryRun: false, now: NOW });
      const reasons = new Map(
        summary.nominated.map((entry) => [entry.candidate.name, entry.reason]),
      );

      expect(reasons.get('plan-c34e018b')).toBe(
        PLAN_RUN_WORKTREE_NOMINATION.PR_MERGED,
      );
      expect(reasons.get('plan-49d72fc4')).toBe(
        PLAN_RUN_WORKTREE_NOMINATION.PR_CLOSED,
      );
      expect(reasons.get('plan-3e68abb9')).toBe(
        PLAN_RUN_WORKTREE_NOMINATION.PLAN_MISSING,
      );
      expect(reasons.has('plan-0b6dfaf8')).toBe(false);
    });

    it('keeps the dirty and unpushed worktrees it nominated', async () => {
      const { service } = build(SNAPSHOT);

      const summary = await service.sweep({ dryRun: false, now: NOW });
      const kept = summary.nominated
        .filter(
          (entry) =>
            entry.verdict.outcome !==
            PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
        )
        .map((entry) => entry.verdict.outcome);

      expect(kept.sort()).toEqual([
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
        PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED,
      ]);
    });
  });

  describe('when dry-running', () => {
    it('assesses every nominee and removes nothing', async () => {
      const { assess, emitSystemAlert, service, teardown } = build(SNAPSHOT);

      const summary = await service.sweep({ dryRun: true, now: NOW });

      expect(teardown).not.toHaveBeenCalled();
      expect(assess).toHaveBeenCalledTimes(5);
      expect(summary.removed).toBe(0);
      expect(emitSystemAlert).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          message: expect.stringContaining(
            `would remove ${pathOf('plan-c34e018b')}`,
          ),
        }),
      );
    });
  });

  describe('when more worktrees are removable than the per-tick cap', () => {
    it('removes five and defers the rest', async () => {
      const many: Fixture[] = Array.from({ length: 7 }, (_, index) => ({
        name: `plan-0000000${index}`,
        plan: null,
        prState: 'MERGED',
        teardown: 'removed',
        workBeyondDefault: true,
      }));
      const { service, teardown } = build(many);

      const summary = await service.sweep({ dryRun: false, now: NOW });

      expect(summary.removed).toBe(5);
      expect(summary.deferred).toBe(2);
      expect(teardown).toHaveBeenCalledTimes(5);
    });
  });

  describe('when a worktree holds nothing beyond the default branch', () => {
    it('nominates it once idle past the age floor, even for an open plan', async () => {
      const { service } = build([
        {
          name: 'plan-aaaaaaaa',
          plan: { status: 'PENDING', updatedAt: LONG_AGO },
          prState: null,
          teardown: 'removed',
          workBeyondDefault: false,
        },
      ]);

      const summary = await service.sweep({ dryRun: false, now: NOW });

      expect(summary.nominated[0]?.reason).toBe(
        PLAN_RUN_WORKTREE_NOMINATION.NO_WORK_IDLE,
      );
    });

    it('does not nominate it while the plan is recently active', async () => {
      const { service } = build([
        {
          name: 'plan-aaaaaaaa',
          plan: { status: 'PENDING', updatedAt: RECENT },
          prState: null,
          teardown: 'removed',
          workBeyondDefault: false,
        },
      ]);

      const summary = await service.sweep({ dryRun: false, now: NOW });

      expect(summary.nominated).toEqual([]);
    });
  });

  describe('when a worktree is not a server-provisioned plan-run worktree', () => {
    it('ignores it entirely', async () => {
      const { service, teardown } = build(
        [],
        [discovered('loop-plan-0414a40b'), discovered('feature-x')],
      );

      const summary = await service.sweep({ dryRun: false, now: NOW });

      expect(summary.examined).toBe(0);
      expect(teardown).not.toHaveBeenCalled();
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('skips a plan-run worktree whose primary checkout cannot be derived', async () => {
      const { service } = build(
        [],
        [
          createMock<DiscoveredWorktree>({
            branch: 'openthrottle/plan-bbbbbbbb',
            commonDir: null,
            name: 'plan-bbbbbbbb',
            path: pathOf('plan-bbbbbbbb'),
          }),
        ],
      );

      const summary = await service.sweep({ dryRun: false, now: NOW });

      expect(summary.examined).toBe(0);
    });
  });

  describe('when nothing is nominated', () => {
    it('raises no alert', async () => {
      const { emitSystemAlert, service } = build([]);

      await service.sweep({ dryRun: true, now: NOW });

      expect(emitSystemAlert).not.toHaveBeenCalled();
    });
  });
});
