import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { PlanRun } from './plan-run.entity.ts';
import { PLAN_RUN_STATUS } from './plan-runs.constants.ts';
import { planRunsFactory } from './plan-runs.factory.ts';
import type { PlanRunsRepositoryMock } from './plan-runs.types.ts';

/**
 * @description Builds a {@link PlanRunsRepositoryMock} that starts as an empty `plan_runs` table
 * (see `createBaseRepositoryMock`): lookups resolve null or an empty collection, guarded writes
 * match no row (0 / false / null), and the two inserts (`recordQueuedRun`, `registerCliRun`)
 * resolve a factory row carrying their input. Provide it in place of `PlanRunsRepository` and stub
 * per test. Test-only: imports `vitest`.
 * @public
 */
export function createPlanRunsRepositoryMock(): PlanRunsRepositoryMock {
  return {
    ...createBaseRepositoryMock<PlanRun, CreateModelInput<PlanRun>>(
      'plan_runs',
    ),
    cancelScheduledRunsForPlan: vi.fn(async () => {
      return [];
    }),
    clearRunLocation: vi.fn(async () => {
      return 0;
    }),
    countUsageLimitedInChain: vi.fn(async () => {
      return 0;
    }),
    findByQueueNameAndBullmqJobId: vi.fn(async () => {
      return null;
    }),
    findEarliestScheduledForByPlanIds: vi.fn(async () => {
      return new Map();
    }),
    findEndedRunsWithoutPullRequest: vi.fn(async () => {
      return [];
    }),
    findLiveRunsByCheckoutIds: vi.fn(async () => {
      return [];
    }),
    findPlanIdsWithLiveDetachedRun: vi.fn(async () => {
      return new Set<string>();
    }),
    findRecentByPlanId: vi.fn(async () => {
      return [];
    }),
    findRunById: vi.fn(async () => {
      return null;
    }),
    findRunHistoryByPlanId: vi.fn(async () => {
      return [];
    }),
    findScheduledByPlanId: vi.fn(async () => {
      return [];
    }),
    findScheduledRunsWithJob: vi.fn(async () => {
      return [];
    }),
    findStaleInProgressRuns: vi.fn(async () => {
      return [];
    }),
    findStaleUnsupervisedRuns: vi.fn(async () => {
      return [];
    }),
    findUnsettledRunsByCheckoutIds: vi.fn(async () => {
      return [];
    }),
    forceSettleUnsupervisedRun: vi.fn(async () => {
      return null;
    }),
    hasActiveRun: vi.fn(async () => {
      return false;
    }),
    hasUnsettledRun: vi.fn(async () => {
      return false;
    }),
    markRunStarted: vi.fn(async () => {
      return 0;
    }),
    readCancelRequested: vi.fn(async () => {
      return null;
    }),
    recordHeartbeatById: vi.fn(async () => {
      return 0;
    }),
    recordHeartbeatByJob: vi.fn(async () => {
      return 0;
    }),
    recordQueuedRun: vi.fn(async (input) => {
      return planRunsFactory.build({
        actorUserId: input.actorUserId ?? null,
        branch: input.branch ?? null,
        bullmqJobId: input.bullmqJobId,
        checkoutId: input.checkoutId ?? null,
        executionBackend: input.executionBackend,
        model: input.model ?? null,
        planId: input.planId,
        queueName: input.queueName,
        resumeOfRunId: input.resumeOfRunId ?? null,
        runConfigSnapshot: input.runConfigSnapshot ?? null,
        runKind: input.runKind,
        scheduledFor: input.scheduledFor ?? null,
        status: input.status ?? PLAN_RUN_STATUS.QUEUED,
      });
    }),
    registerCliRun: vi.fn(async (input) => {
      return planRunsFactory.build({
        actorUserId: input.actorUserId ?? null,
        branch: input.branch ?? null,
        bullmqJobId: null,
        executionBackend: input.executionBackend,
        heartbeatExpected: input.heartbeatExpected ?? true,
        hostname: input.hostname,
        model: input.model ?? null,
        pid: input.pid,
        planId: input.planId,
        status: PLAN_RUN_STATUS.IN_PROGRESS,
        workerId: input.workerId,
      });
    }),
    rescheduleScheduledRun: vi.fn(async () => {
      return false;
    }),
    setCheckoutAndBranch: vi.fn(async () => {
      return null;
    }),
    setCheckoutIdIfNull: vi.fn(async () => {
      return null;
    }),
    setRunConfigSnapshotWorkspace: vi.fn(async () => {
      return null;
    }),
    settleCliRun: vi.fn(async () => {
      return null;
    }),
    settleQueuedRunsCancelledByJobIds: vi.fn(async () => {
      return 0;
    }),
    settleRunByJob: vi.fn(async () => {
      return null;
    }),
    settleRunUsageLimited: vi.fn(async () => {
      return null;
    }),
    settleScheduledRunCancelled: vi.fn(async () => {
      return false;
    }),
    settleScheduledRunsCancelled: vi.fn(async () => {
      return 0;
    }),
    settleStaleRun: vi.fn(async () => {
      return null;
    }),
    settleSupersededUnsupervisedRuns: vi.fn(async () => {
      return 0;
    }),
    settleUnsettledRunByJob: vi.fn(async () => {
      return false;
    }),
    settleUnsupervisedRunForPullRequest: vi.fn(async () => {
      return null;
    }),
    stampCancelRequested: vi.fn(async () => {
      return null;
    }),
    transitionScheduledRun: vi.fn(async () => {
      return false;
    }),
  };
}
