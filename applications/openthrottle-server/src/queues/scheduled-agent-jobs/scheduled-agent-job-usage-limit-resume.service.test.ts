import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
  type ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  USAGE_LIMIT_RESUME_BUFFER_MS,
  USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
} from '../usage-limit/usage-limit.constants.ts';
import type { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service.ts';
import {
  ScheduledAgentJobUsageLimitResumeService,
  usageLimitResumeJobId,
} from './scheduled-agent-job-usage-limit-resume.service.ts';
import {
  SCHEDULED_AGENT_JOB_NAME,
  SCHEDULED_AGENT_JOB_OPTIONS,
} from './scheduled-agent-jobs.constants.ts';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types.ts';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1_000;
const at = (offsetMs: number): string => {
  return new Date(NOW.getTime() + offsetMs).toISOString();
};

const jobFixture = (
  overrides: Partial<ScheduledAgentJob> = {},
): ScheduledAgentJob => {
  return createMock<ScheduledAgentJob>({
    cronPattern: '0 9 * * *',
    cwd: '/repos/monorepo',
    driverId: 'claude',
    enabled: true,
    id: 'sched-1',
    model: 'opus',
    prompt: 'do it',
    repositoryCheckoutId: null,
    schedulerKey: 'scheduled-job:sched-1',
    settings: {},
    timeoutMs: null,
    ...overrides,
  });
};

describe('ScheduledAgentJobUsageLimitResumeService', () => {
  let jobsService: ScheduledAgentJobsService;
  let scheduler: ScheduledAgentJobSchedulerService;
  let queue: Queue<ScheduledAgentJobPayload, void>;
  let runRepoDelete: ReturnType<typeof vi.fn>;
  let service: ScheduledAgentJobUsageLimitResumeService;

  const handle = (
    overrides: { resetsAt?: string | null; now?: Date } = {},
  ): ReturnType<ScheduledAgentJobUsageLimitResumeService['handle']> => {
    return service.handle({
      limit: {
        rateLimitType: 'five_hour',
        resetsAt:
          overrides.resetsAt === undefined
            ? at(2 * HOUR_MS)
            : overrides.resetsAt,
      },
      limitedRunId: 'run-limited',
      now: overrides.now ?? NOW,
      scheduleId: 'sched-1',
    });
  };

  beforeEach(() => {
    runRepoDelete = vi.fn().mockResolvedValue({ affected: 1 });
    jobsService = createMock<ScheduledAgentJobsService>({
      countUsageLimitedInChain: vi.fn().mockResolvedValue(1),
      createRun: vi
        .fn()
        .mockResolvedValue(
          createMock<ScheduledAgentJobRun>({ id: 'run-next' }),
        ),
      findJobById: vi.fn().mockResolvedValue(jobFixture()),
      findRunById: vi.fn().mockResolvedValue(
        createMock<ScheduledAgentJobRun>({
          errorMessage: 'Usage limit reached (five_hour); resets at later',
        }),
      ),
      findRunResumingFrom: vi.fn().mockResolvedValue(null),
      getRunRepository: vi.fn().mockReturnValue({ delete: runRepoDelete }),
      updateRunErrorMessage: vi.fn().mockResolvedValue(undefined),
    });
    scheduler = createMock<ScheduledAgentJobSchedulerService>({
      readNextRunAt: vi.fn().mockResolvedValue(null),
    });
    queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      add: vi.fn().mockResolvedValue({}),
    });
    service = new ScheduledAgentJobUsageLimitResumeService(
      createMock<LoggerService>(),
      jobsService,
      scheduler,
      queue,
    );
  });

  describe('resume', () => {
    it('pre-creates a queued resume run linked to the limited run and enqueues a delayed job', async () => {
      const outcome = await handle();

      expect(outcome).toEqual({ outcome: 'resumed', resumeRunId: 'run-next' });
      expect(jobsService.createRun).toHaveBeenCalledExactlyOnceWith({
        bullmqJobId: 'usage-limit-resume-run-limited',
        driverId: 'claude',
        model: 'opus',
        resumeOfRunId: 'run-limited',
        scheduledAgentJobId: 'sched-1',
        status: 'queued',
        trigger: 'resume',
      });
      expect(queue.add).toHaveBeenCalledExactlyOnceWith(
        SCHEDULED_AGENT_JOB_NAME,
        expect.objectContaining({
          driverId: 'claude',
          prompt: 'do it',
          runId: 'run-next',
          scheduleId: 'sched-1',
        }),
        {
          ...SCHEDULED_AGENT_JOB_OPTIONS,
          delay: 2 * HOUR_MS + USAGE_LIMIT_RESUME_BUFFER_MS,
          jobId: 'usage-limit-resume-run-limited',
        },
      );
      expect(jobsService.updateRunErrorMessage).not.toHaveBeenCalled();
    });

    it('uses the reset-plus-buffer delay even when the reset has just passed', async () => {
      await handle({ resetsAt: at(-60_000) });

      expect(vi.mocked(queue.add).mock.calls[0]?.[2]?.delay).toBe(
        USAGE_LIMIT_RESUME_BUFFER_MS,
      );
    });

    it('resumes when the next cron fire is after the resume time', async () => {
      vi.mocked(scheduler.readNextRunAt).mockResolvedValue(
        new Date(
          NOW.getTime() + 2 * HOUR_MS + 2 * USAGE_LIMIT_RESUME_BUFFER_MS,
        ),
      );

      expect((await handle()).outcome).toBe('resumed');
    });

    it('is idempotent: an existing continuation is reported, not duplicated', async () => {
      vi.mocked(jobsService.findRunResumingFrom).mockResolvedValue(
        createMock<ScheduledAgentJobRun>({ id: 'run-existing' }),
      );

      expect(await handle()).toEqual({
        outcome: 'resumed',
        resumeRunId: 'run-existing',
      });
      expect(jobsService.createRun).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('treats a lost unique-index race as already resumed', async () => {
      vi.mocked(jobsService.createRun).mockRejectedValue(
        new Error('duplicate key value violates unique constraint'),
      );
      vi.mocked(jobsService.findRunResumingFrom)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          createMock<ScheduledAgentJobRun>({ id: 'run-winner' }),
        );

      expect(await handle()).toEqual({
        outcome: 'resumed',
        resumeRunId: 'run-winner',
      });
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('removes the orphan run row and holds when the enqueue fails', async () => {
      vi.mocked(queue.add).mockRejectedValue(new Error('redis down'));

      const outcome = await handle();

      expect(outcome.outcome).toBe('held');
      expect(runRepoDelete).toHaveBeenCalledWith({ id: 'run-next' });
      expect(jobsService.updateRunErrorMessage).toHaveBeenCalledWith(
        'run-limited',
        expect.stringContaining('scheduling the resume failed: redis down'),
      );
    });
  });

  describe('hold', () => {
    const expectHeld = async (
      reason: string,
      overrides?: Parameters<typeof handle>[0],
    ): Promise<void> => {
      const outcome = await handle(overrides);

      expect(outcome).toEqual({ outcome: 'held', reason });
      expect(jobsService.createRun).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
      expect(jobsService.updateRunErrorMessage).toHaveBeenCalledWith(
        'run-limited',
        `Usage limit reached (five_hour); resets at later; not resumed automatically (${reason})`,
      );
    };

    it('holds when the reset time is unknown', async () => {
      await expectHeld('the reset time is unknown', { resetsAt: null });
    });

    it('holds when the reset is more than 24 hours away', async () => {
      await expectHeld('the reset is more than 24 hours away', {
        resetsAt: at(25 * HOUR_MS),
      });
    });

    it('holds when the chain has already hit the limit too many times', async () => {
      vi.mocked(jobsService.countUsageLimitedInChain).mockResolvedValue(
        USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
      );

      await expectHeld('it has already been resumed after 2 usage limits');
      expect(jobsService.countUsageLimitedInChain).toHaveBeenCalledWith(
        'run-limited',
        USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
      );
    });

    it('holds when the next scheduled run is sooner than the resume', async () => {
      vi.mocked(scheduler.readNextRunAt).mockResolvedValue(
        new Date(NOW.getTime() + HOUR_MS),
      );

      await expectHeld('the next scheduled run is sooner');
    });

    it('holds when the next scheduled run is exactly at the resume time', async () => {
      vi.mocked(scheduler.readNextRunAt).mockResolvedValue(
        new Date(NOW.getTime() + 2 * HOUR_MS + USAGE_LIMIT_RESUME_BUFFER_MS),
      );

      await expectHeld('the next scheduled run is sooner');
    });

    it('holds for a disabled schedule', async () => {
      vi.mocked(jobsService.findJobById).mockResolvedValue(
        jobFixture({ enabled: false }),
      );

      await expectHeld('the schedule is disabled');
    });

    it('holds for a schedule that no longer exists', async () => {
      vi.mocked(jobsService.findJobById).mockResolvedValue(null);

      await expectHeld('the schedule no longer exists');
    });

    it('falls back to the base policy when the next fire time cannot be read', async () => {
      vi.mocked(scheduler.readNextRunAt).mockRejectedValue(new Error('boom'));

      expect((await handle()).outcome).toBe('resumed');
    });
  });

  describe('never throws', () => {
    it('holds when a repository read fails', async () => {
      vi.mocked(jobsService.findJobById).mockRejectedValue(
        new Error('db down'),
      );

      await expect(handle()).resolves.toEqual({
        outcome: 'held',
        reason: 'resume bookkeeping failed',
      });
    });

    it('still holds when even recording the reason fails', async () => {
      vi.mocked(jobsService.findJobById).mockRejectedValue(
        new Error('db down'),
      );
      vi.mocked(jobsService.findRunById).mockRejectedValue(
        new Error('db down'),
      );
      vi.mocked(jobsService.updateRunErrorMessage).mockRejectedValue(
        new Error('db down'),
      );

      await expect(handle()).resolves.toEqual({
        outcome: 'held',
        reason: 'resume bookkeeping failed',
      });
    });
  });

  it('derives a deterministic jobId from the limited run id', () => {
    expect(usageLimitResumeJobId('abc')).toBe('usage-limit-resume-abc');
  });
});
