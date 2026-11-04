import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRun,
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanEnqueueService } from '../../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import type { PlanStatusService } from '../../../graphql/plans/plan-status.service.ts';
import type { StatusChangeSystemAccountService } from '../../../graphql/work-ledger/status-change-system-account.service.ts';
import type { WorkLedgerCaptureService } from '../../../graphql/work-ledger/work-ledger-capture.service.ts';
import type { NotificationsService } from '../../../notifications/notifications.service.ts';
import { PLANS_QUEUE_NAME } from '../plans.constants.ts';
import type { RunPlanOrchestratorJobData } from '../plans.types.ts';
import { UsageLimitResumeService } from './usage-limit-resume.service.ts';

const PLAN_ID = '2794d106-95f9-427e-904d-e0f9b5cbe734';
const RUN_ID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-11-01T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1_000;

const jobData: RunPlanOrchestratorJobData = {
  planId: PLAN_ID,
  runKind: 'orchestrator',
};
const limitedRun = createMock<PlanRun>({ id: RUN_ID, planId: PLAN_ID });
const limitAt = (
  offsetMs: number,
): {
  rateLimitType: string;
  resetsAt: string;
} => {
  return {
    rateLimitType: 'five_hour',
    resetsAt: new Date(NOW.getTime() + offsetMs).toISOString(),
  };
};

describe('UsageLimitResumeService', () => {
  const settleRunUsageLimited = vi.fn();
  const countUsageLimitedInChain = vi.fn();
  const readCancelRequested = vi.fn();
  const findOnePlan = vi.fn();
  const enqueueUsageLimitResume = vi.fn();
  const writeGuardedStatus = vi.fn();
  const transaction = vi.fn();
  const emitPlanStatusChanged = vi.fn();

  let service: UsageLimitResumeService;

  beforeEach(() => {
    vi.clearAllMocks();
    settleRunUsageLimited.mockResolvedValue(limitedRun);
    countUsageLimitedInChain.mockResolvedValue(1);
    readCancelRequested.mockResolvedValue(null);
    findOnePlan.mockResolvedValue({ id: PLAN_ID, status: 'IN_PROGRESS' });
    enqueueUsageLimitResume.mockResolvedValue({
      jobId: `usage-limit-resume-${RUN_ID}`,
    });
    writeGuardedStatus.mockResolvedValue(true);
    transaction.mockResolvedValue(0);

    service = new UsageLimitResumeService(
      createMock<LoggerService>(),
      createMock<NotificationsService>({ emitPlanStatusChanged }),
      createMock<PlanEnqueueService>({ enqueueUsageLimitResume }),
      createMock<PlanRunsService>({
        countUsageLimitedInChain,
        readCancelRequested,
        settleRunUsageLimited,
      }),
      createMock<PlansService>({
        getRepository: vi.fn().mockReturnValue({ findOne: findOnePlan }),
      }),
      createMock<PlanStatusService>({ writeGuardedStatus }),
      createMock<StatusChangeSystemAccountService>({
        resolveId: vi.fn().mockResolvedValue('system-account-id'),
      }),
      createMock<TasksService>({
        getRepository: vi.fn().mockReturnValue({ manager: { transaction } }),
      }),
      createMock<WorkLedgerCaptureService>(),
    );
  });

  const handle = (limit: {
    rateLimitType: string | null;
    resetsAt: string | null;
  }) => {
    return service.handle({
      jobData,
      jobId: 'job-1',
      limit,
      now: NOW,
      planId: PLAN_ID,
    });
  };

  describe('resume path', () => {
    it('settles the run USAGE_LIMITED with the limit, then enqueues a delayed continuation of the same job data', async () => {
      const limit = limitAt(2 * HOUR_MS);

      const result = await handle(limit);

      expect(settleRunUsageLimited).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
        { resetsAt: new Date(limit.resetsAt), type: 'five_hour' },
      );
      expect(enqueueUsageLimitResume).toHaveBeenCalledExactlyOnceWith({
        actorKind: 'service_account',
        actorSub: 'system-account-id',
        delayMs: 2 * HOUR_MS + 60_000,
        jobData,
        limitedRun,
      });
      expect(result.outcome).toBe('resumed');
      expect(result.message).toBe(
        'Plan paused: usage limit reached — resumes at 2026-11-01T14:01:00.000Z',
      );
      expect(emitPlanStatusChanged).toHaveBeenCalledWith({
        planId: PLAN_ID,
        status: 'QUEUED',
      });
      expect(writeGuardedStatus).not.toHaveBeenCalled();
    });

    it('bounds the chain walk by the policy depth', async () => {
      await handle(limitAt(HOUR_MS));

      expect(countUsageLimitedInChain).toHaveBeenCalledWith(RUN_ID, 3);
    });
  });

  describe('hold path', () => {
    it('parks the plan PENDING (and its QUEUED tasks) when the reset is unknown, naming the reason', async () => {
      const result = await handle({
        rateLimitType: 'seven_day',
        resetsAt: null,
      });

      expect(enqueueUsageLimitResume).not.toHaveBeenCalled();
      expect(writeGuardedStatus).toHaveBeenCalledWith(
        PLAN_ID,
        expect.objectContaining({
          guardCurrentStatus: 'IN_PROGRESS',
          requestedStatus: 'PENDING',
        }),
      );
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(result.outcome).toBe('held');
      expect(result.message).toBe(
        'Plan paused: usage limit reached — resets at an unknown time; not resuming automatically (the reset time is unknown)',
      );
      expect(emitPlanStatusChanged).toHaveBeenCalledWith({
        planId: PLAN_ID,
        status: 'PENDING',
      });
    });

    it('holds when the reset is more than 24h away', async () => {
      const result = await handle(limitAt(48 * HOUR_MS));

      expect(result.outcome).toBe('held');
      expect(result.message).toContain('more than 24 hours away');
      expect(enqueueUsageLimitResume).not.toHaveBeenCalled();
    });

    it('holds once the continuation chain already has 3 limited runs', async () => {
      countUsageLimitedInChain.mockResolvedValue(3);

      const result = await handle(limitAt(HOUR_MS));

      expect(result.outcome).toBe('held');
      expect(enqueueUsageLimitResume).not.toHaveBeenCalled();
    });

    it('falls back to parking the plan when scheduling the resume fails', async () => {
      enqueueUsageLimitResume.mockRejectedValue(new Error('redis down'));

      const result = await handle(limitAt(HOUR_MS));

      expect(result.outcome).toBe('held');
      expect(result.message).toContain(
        'scheduling the resume failed: redis down',
      );
      expect(writeGuardedStatus).toHaveBeenCalled();
    });
  });

  describe('skipped', () => {
    it('leaves everything alone when the run row was already settled elsewhere', async () => {
      settleRunUsageLimited.mockResolvedValue(null);

      const result = await handle(limitAt(HOUR_MS));

      expect(result.outcome).toBe('skipped');
      expect(enqueueUsageLimitResume).not.toHaveBeenCalled();
      expect(writeGuardedStatus).not.toHaveBeenCalled();
    });

    it('does not resume or rewrite the plan when it was cancelled meanwhile (no longer IN_PROGRESS)', async () => {
      findOnePlan.mockResolvedValue({ id: PLAN_ID, status: 'PENDING' });

      const result = await handle(limitAt(HOUR_MS));

      expect(result.outcome).toBe('skipped');
      expect(enqueueUsageLimitResume).not.toHaveBeenCalled();
      expect(writeGuardedStatus).not.toHaveBeenCalled();
    });

    it('does not resume when a cancel was requested against the run', async () => {
      readCancelRequested.mockResolvedValue({
        cancelRequestedAt: NOW,
        cancelRequestedBy: null,
      });

      const result = await handle(limitAt(HOUR_MS));

      expect(result.outcome).toBe('skipped');
      expect(enqueueUsageLimitResume).not.toHaveBeenCalled();
    });
  });

  describe('never throws', () => {
    it('resolves with a held outcome when the settle write itself throws', async () => {
      settleRunUsageLimited.mockRejectedValue(new Error('db down'));

      await expect(handle(limitAt(HOUR_MS))).resolves.toMatchObject({
        outcome: 'held',
      });
    });

    it('resolves even when parking the plan fails too', async () => {
      writeGuardedStatus.mockRejectedValue(new Error('db down'));

      await expect(
        handle({ rateLimitType: null, resetsAt: null }),
      ).resolves.toMatchObject({ outcome: 'held' });
    });
  });
});
