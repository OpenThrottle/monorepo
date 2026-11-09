import { createMock } from '@golevelup/ts-vitest';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  ScheduledAgentJobCheckoutPathService,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import {
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import {
  RUN_AGENT_STATUS,
  type RunAgentPromptResult,
} from '@openthrottle/openthrottle-drivers';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { BullMqRunOutputRetentionService } from '../bullmq-run-output/retention/retention.service.ts';
import type { ScheduledAgentJobCancellationService } from './cancellation/cancellation.service.ts';
import type { ScheduledAgentJobDirectoryLockService } from './directory-lock/directory-lock.service.ts';
import type { ScheduledAgentJobDirectoryLockResult } from './directory-lock/directory-lock.types.ts';
import type { ScheduledAgentJobFailureNotifierService } from './failure-notifier/failure-notifier.service.ts';
import type { ScheduledAgentRunnerService } from './runner/runner.service.ts';
import { ScheduledAgentJobsProcessor } from './scheduled-agent-jobs.processor.ts';
import type { ScheduledAgentJobBullJob } from './scheduled-agent-jobs.types.ts';
import { foldRunUsage, parseRunOutcome } from './scheduled-agent-jobs.utils.ts';
import type { ScheduledAgentJobSchedulerService } from './scheduler/scheduler.service.ts';
import type { ScheduledAgentJobUsageLimitResumeService } from './usage-limit-resume/usage-limit-resume.service.ts';

const result = (
  overrides: Partial<RunAgentPromptResult>,
): RunAgentPromptResult => {
  return {
    accountError: null,
    driverId: 'claude',
    exitCode: 0,
    output: '',
    status: RUN_AGENT_STATUS.ok,
    usageLimit: null,
    ...overrides,
  };
};

/** The usage columns a run with no parseable usage persists (all null). */
const NULL_USAGE_COLUMNS = {
  cacheReadTokens: null,
  cacheWriteTokens: null,
  costUsd: null,
  inputTokens: null,
  outputTokens: null,
  rawUsage: null,
  reasoningTokens: null,
  totalTokens: null,
} as const;

/** A realistic claude stream-json run: an assistant line (usage nested under `message`, ignored by
 * the normalizer) plus the terminal `result` line carrying top-level usage + total_cost_usd. */
const CLAUDE_JSONL = [
  JSON.stringify({
    message: { id: 'msg_1', usage: { input_tokens: 100, output_tokens: 50 } },
    type: 'assistant',
  }),
  JSON.stringify({
    is_error: false,
    modelUsage: { 'claude-opus-4': { costUSD: 0.0123 } },
    result: 'done',
    subtype: 'success',
    total_cost_usd: 0.0123,
    type: 'result',
    usage: {
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 20,
      input_tokens: 100,
      output_tokens: 50,
    },
  }),
].join('\n');

const makeJob = (
  data: Partial<ScheduledAgentJobBullJob['data']> = {},
): ScheduledAgentJobBullJob => {
  return createMock<ScheduledAgentJobBullJob>({
    data: {
      driverId: 'claude',
      prompt: 'do it',
      scheduleId: 'sched-1',
      ...data,
    },
    id: 'bull-1',
  });
};

describe('ScheduledAgentJobsProcessor', () => {
  let jobsService: ScheduledAgentJobsService;
  let checkoutPaths: ScheduledAgentJobCheckoutPathService;
  let runner: ScheduledAgentRunnerService;
  let cancellation: ScheduledAgentJobCancellationService;
  let directoryLock: ScheduledAgentJobDirectoryLockService;
  let usageLimitResume: ScheduledAgentJobUsageLimitResumeService;
  let release: Mock<() => Promise<void>>;
  let retention: BullMqRunOutputRetentionService;
  let scheduler: ScheduledAgentJobSchedulerService;
  let writer: KeyedJsonlWriter;
  let failureNotifier: ScheduledAgentJobFailureNotifierService;
  let jobRepoUpdate: ReturnType<typeof vi.fn>;
  let runRepoFindOne: ReturnType<typeof vi.fn>;
  let processor: ScheduledAgentJobsProcessor;

  beforeEach(() => {
    jobRepoUpdate = vi.fn().mockResolvedValue({ affected: 1 });
    runRepoFindOne = vi.fn().mockResolvedValue(null);

    jobsService = createMock<ScheduledAgentJobsService>({
      createRun: vi
        .fn()
        .mockResolvedValue(createMock<ScheduledAgentJobRun>({ id: 'run-1' })),
      findJobById: vi
        .fn()
        .mockResolvedValue(
          createMock<ScheduledAgentJob>({ ownerUserId: 'user-1' }),
        ),
      findRunById: vi.fn().mockResolvedValue(null),
      getJobRepository: vi.fn().mockReturnValue({ update: jobRepoUpdate }),
      getRunRepository: vi.fn().mockReturnValue({ findOne: runRepoFindOne }),
      markRunFinished: vi.fn().mockResolvedValue(undefined),
      markRunStarted: vi.fn().mockResolvedValue(undefined),
    });

    checkoutPaths = createMock<ScheduledAgentJobCheckoutPathService>({
      resolve: vi.fn().mockResolvedValue({ error: 'not-found' }),
    });

    runner = createMock<ScheduledAgentRunnerService>({
      run: vi.fn().mockResolvedValue(result({})),
    });

    cancellation = createMock<ScheduledAgentJobCancellationService>({
      attach: vi.fn().mockReturnValue(new AbortController().signal),
      detach: vi.fn(),
    });
    release = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    directoryLock = createMock<ScheduledAgentJobDirectoryLockService>({
      acquire: vi
        .fn()
        .mockResolvedValue({ lock: { held: true, release }, status: 'held' }),
    });
    usageLimitResume = createMock<ScheduledAgentJobUsageLimitResumeService>({
      handle: vi.fn().mockResolvedValue({ outcome: 'held', reason: 'test' }),
    });
    retention = createMock<BullMqRunOutputRetentionService>();
    scheduler = createMock<ScheduledAgentJobSchedulerService>({
      armSelfScheduledFire: vi.fn().mockResolvedValue(null),
    });
    writer = createMock<KeyedJsonlWriter>();
    failureNotifier = createMock<ScheduledAgentJobFailureNotifierService>({
      notify: vi.fn().mockResolvedValue(undefined),
    });

    processor = new ScheduledAgentJobsProcessor(
      createMock<LoggerService>(),
      jobsService,
      checkoutPaths,
      runner,
      cancellation,
      directoryLock,
      usageLimitResume,
      retention,
      scheduler,
      failureNotifier,
      writer,
    );
  });

  it('creates a run for a scheduled fire, runs the driver, records success + lastRunAt', async () => {
    await processor.process(makeJob({ model: 'opus' }));

    expect(jobsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        bullmqJobId: 'bull-1',
        scheduledAgentJobId: 'sched-1',
        trigger: 'schedule',
      }),
    );
    expect(jobsService.markRunStarted).toHaveBeenCalledWith('run-1', 'bull-1');

    const runConfig = vi.mocked(runner.run).mock.calls[0]?.[0];
    expect(runConfig?.driverId).toBe('claude');
    expect(runConfig?.model).toBe('opus');
    expect(runConfig?.prompt).toBe('do it');

    expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
      errorMessage: null,
      exitCode: 0,
      status: 'succeeded',
      ...NULL_USAGE_COLUMNS,
    });
    expect(jobRepoUpdate).toHaveBeenCalledWith(
      { id: 'sched-1' },
      expect.objectContaining({ lastRunAt: expect.any(Date) }),
    );
    expect(cancellation.detach).toHaveBeenCalledWith('run-1');
  });

  it('re-resolves the targeted checkout per run and spawns the CLI there', async () => {
    // The payload path is deliberately stale; the checkout is the source of truth.
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ path: process.cwd() });

    await processor.process(
      makeJob({
        cwd: '/stale/snapshot/path',
        repositoryCheckoutId: 'checkout-1',
      }),
    );

    // Scoped to the schedule row's owner, never a payload-supplied user.
    expect(checkoutPaths.resolve).toHaveBeenCalledWith({
      checkoutId: 'checkout-1',
      ownerUserId: 'user-1',
    });
    expect(vi.mocked(runner.run).mock.calls[0]?.[0]?.cwd).toBe(process.cwd());
    // Provenance lands on the run row.
    expect(jobsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryCheckoutId: 'checkout-1',
        resolvedCwd: process.cwd(),
      }),
    );
  });

  it('backfills checkout provenance onto a pre-created run-now row', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ path: process.cwd() });
    vi.mocked(jobsService.findRunById).mockResolvedValue(
      createMock<ScheduledAgentJobRun>({ id: 'run-now-9' }),
    );

    await processor.process(
      makeJob({ repositoryCheckoutId: 'checkout-1', runId: 'run-now-9' }),
    );

    expect(jobsService.markRunStarted).toHaveBeenCalledWith(
      'run-now-9',
      'bull-1',
      expect.objectContaining({
        repositoryCheckoutId: 'checkout-1',
        resolvedCwd: process.cwd(),
      }),
    );
  });

  it('falls back to the payload cwd when the targeted checkout is gone', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ error: 'not-found' });

    await processor.process(
      makeJob({ cwd: process.cwd(), repositoryCheckoutId: 'deleted' }),
    );

    // Still runs — from the fallback path — and does NOT claim the dead checkout on the run row.
    expect(vi.mocked(runner.run).mock.calls[0]?.[0]?.cwd).toBe(process.cwd());
    expect(jobsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryCheckoutId: null,
        resolvedCwd: process.cwd(),
      }),
    );
    expect(jobsService.markRunFinished).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'succeeded' }),
    );
  });

  it('fails the run with a legible message when the resolved directory does not exist', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ error: 'not-found' });

    await processor.process(
      makeJob({
        cwd: '/definitely/not/a/real/dir',
        repositoryCheckoutId: 'gone',
      }),
    );

    expect(runner.run).not.toHaveBeenCalled();
    const finish = vi.mocked(jobsService.markRunFinished).mock.calls[0]?.[1];
    expect(finish?.status).toBe('failed');
    expect(finish?.errorMessage).toContain('gone');
    expect(finish?.errorMessage).toContain('/definitely/not/a/real/dir');
  });

  it('leaves a legacy cwd-only payload untouched (no checkout resolution)', async () => {
    await processor.process(makeJob({ cwd: process.cwd() }));

    expect(checkoutPaths.resolve).not.toHaveBeenCalled();
    expect(vi.mocked(runner.run).mock.calls[0]?.[0]?.cwd).toBe(process.cwd());
    expect(jobsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryCheckoutId: null,
        resolvedCwd: process.cwd(),
      }),
    );
  });

  it('records no_op when a clean exit carries an agent no_op verdict', async () => {
    runner = createMock<ScheduledAgentRunnerService>({
      run: vi.fn().mockResolvedValue(
        result({
          output: 'openthrottle-mcp is unavailable.\nOT_RUN_OUTCOME: no_op',
        }),
      ),
    });
    processor = new ScheduledAgentJobsProcessor(
      createMock<LoggerService>(),
      jobsService,
      checkoutPaths,
      runner,
      cancellation,
      directoryLock,
      usageLimitResume,
      retention,
      scheduler,
      failureNotifier,
      writer,
    );

    await processor.process(makeJob({}));

    expect(jobsService.markRunFinished).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ exitCode: 0, status: 'no_op' }),
    );
  });

  it('still records succeeded when the agent reports completed', async () => {
    runner = createMock<ScheduledAgentRunnerService>({
      run: vi
        .fn()
        .mockResolvedValue(result({ output: 'OT_RUN_OUTCOME: completed' })),
    });
    processor = new ScheduledAgentJobsProcessor(
      createMock<LoggerService>(),
      jobsService,
      checkoutPaths,
      runner,
      cancellation,
      directoryLock,
      usageLimitResume,
      retention,
      scheduler,
      failureNotifier,
      writer,
    );

    await processor.process(makeJob({}));

    expect(jobsService.markRunFinished).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'succeeded' }),
    );
  });

  it('does not let a no_op sentinel upgrade a non-zero exit away from failed', async () => {
    runner = createMock<ScheduledAgentRunnerService>({
      run: vi.fn().mockResolvedValue(
        result({
          exitCode: 1,
          output: 'OT_RUN_OUTCOME: no_op',
          status: RUN_AGENT_STATUS.failed,
        }),
      ),
    });
    processor = new ScheduledAgentJobsProcessor(
      createMock<LoggerService>(),
      jobsService,
      checkoutPaths,
      runner,
      cancellation,
      directoryLock,
      usageLimitResume,
      retention,
      scheduler,
      failureNotifier,
      writer,
    );

    await processor.process(makeJob({}));

    expect(jobsService.markRunFinished).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('claims a pre-created run row for run-now instead of creating one', async () => {
    vi.mocked(jobsService.findRunById).mockResolvedValue(
      createMock<ScheduledAgentJobRun>({ id: 'run-now-9' }),
    );

    await processor.process(makeJob({ runId: 'run-now-9' }));

    expect(jobsService.findRunById).toHaveBeenCalledWith('run-now-9');
    expect(jobsService.createRun).not.toHaveBeenCalled();
    // Run-now backfills the settings snapshot as the pre-created row starts.
    expect(jobsService.markRunStarted).toHaveBeenCalledWith(
      'run-now-9',
      'bull-1',
      expect.objectContaining({
        settingsSnapshot: { driverId: 'claude', model: null, settings: null },
      }),
    );
  });

  it('maps a non-zero exit to failed with the exit code', async () => {
    vi.mocked(runner.run).mockResolvedValue(
      result({ exitCode: 2, status: RUN_AGENT_STATUS.failed }),
    );

    await processor.process(makeJob());

    expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
      errorMessage: 'Agent exited with code 2',
      exitCode: 2,
      status: 'failed',
      ...NULL_USAGE_COLUMNS,
    });
  });

  it('maps a timeout to failed and a cancel to cancelled', async () => {
    vi.mocked(runner.run).mockResolvedValueOnce(
      result({ exitCode: null, status: RUN_AGENT_STATUS.timeout }),
    );
    await processor.process(makeJob());
    expect(jobsService.markRunFinished).toHaveBeenLastCalledWith('run-1', {
      errorMessage: 'Run timed out',
      exitCode: null,
      status: 'failed',
      ...NULL_USAGE_COLUMNS,
    });

    vi.mocked(runner.run).mockResolvedValueOnce(
      result({ exitCode: null, status: RUN_AGENT_STATUS.cancelled }),
    );
    await processor.process(makeJob());
    expect(jobsService.markRunFinished).toHaveBeenLastCalledWith('run-1', {
      errorMessage: 'Run cancelled',
      exitCode: null,
      status: 'cancelled',
      ...NULL_USAGE_COLUMNS,
    });
  });

  describe('cancel requested before the claim', () => {
    it('finishes a run-now run cancelled without spawning the agent', async () => {
      // The cancel landed while BullMQ was moving the job to active: too late to remove the job,
      // too early for an abort controller to exist, so only the durable marker records it.
      vi.mocked(jobsService.findRunById).mockResolvedValue(
        createMock<ScheduledAgentJobRun>({
          cancelRequestedAt: new Date('2026-11-01T12:00:00.000Z'),
          id: 'run-now-9',
          trigger: 'manual',
        }),
      );

      await processor.process(makeJob({ runId: 'run-now-9' }));

      expect(jobsService.markRunStarted).toHaveBeenCalled();
      expect(directoryLock.acquire).not.toHaveBeenCalled();
      expect(runner.run).not.toHaveBeenCalled();
      expect(jobsService.markRunFinished).toHaveBeenCalledExactlyOnceWith(
        'run-now-9',
        { errorMessage: 'Run cancelled', exitCode: null, status: 'cancelled' },
      );
      expect(failureNotifier.notify).not.toHaveBeenCalled();
      expect(cancellation.detach).toHaveBeenCalledWith('run-now-9');
    });

    it('reads the marker only after the abort signal is attached', async () => {
      const order: string[] = [];
      vi.mocked(cancellation.attach).mockImplementation(() => {
        order.push('attach');
        return new AbortController().signal;
      });
      vi.mocked(jobsService.findRunById).mockImplementation(async (id) => {
        order.push(`find:${id}`);
        return createMock<ScheduledAgentJobRun>({
          cancelRequestedAt: null,
          id,
          trigger: 'manual',
        });
      });

      await processor.process(makeJob({ runId: 'run-now-9' }));

      expect(order.lastIndexOf('find:run-now-9')).toBeGreaterThan(
        order.indexOf('attach'),
      );
      expect(runner.run).toHaveBeenCalledOnce();
    });

    it('runs normally when no cancel was requested', async () => {
      await processor.process(makeJob({ model: 'opus' }));

      expect(jobsService.findRunById).toHaveBeenCalledWith('run-1');
      expect(runner.run).toHaveBeenCalledOnce();
    });
  });

  describe('resume of an inactive schedule', () => {
    const resumeRow = (): ScheduledAgentJobRun => {
      return createMock<ScheduledAgentJobRun>({
        id: 'run-resume',
        trigger: 'resume',
      });
    };

    it('cancels a resume run without spawning the agent when the schedule was disabled', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(resumeRow());
      vi.mocked(jobsService.findJobById).mockResolvedValue(
        createMock<ScheduledAgentJob>({ enabled: false }),
      );

      await processor.process(makeJob({ runId: 'run-resume' }));

      expect(runner.run).not.toHaveBeenCalled();
      expect(jobsService.markRunStarted).not.toHaveBeenCalled();
      expect(jobsService.markRunFinished).toHaveBeenCalledExactlyOnceWith(
        'run-resume',
        {
          errorMessage: `The schedule was disabled before the usage-limit resume fired`,
          exitCode: null,
          status: 'cancelled',
        },
      );
    });

    it('skips a resume run whose schedule was deleted (the run row cascaded away)', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(null);
      vi.mocked(jobsService.findJobById).mockResolvedValue(null);

      await processor.process(makeJob({ runId: 'run-resume' }));

      expect(runner.run).not.toHaveBeenCalled();
      expect(jobsService.createRun).not.toHaveBeenCalled();
      expect(jobsService.markRunFinished).not.toHaveBeenCalled();
    });

    it('cancels a surviving resume run with a deleted-schedule message', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(resumeRow());
      vi.mocked(jobsService.findJobById).mockResolvedValue(null);

      await processor.process(makeJob({ runId: 'run-resume' }));

      expect(runner.run).not.toHaveBeenCalled();
      expect(jobsService.markRunFinished).toHaveBeenCalledWith(
        'run-resume',
        expect.objectContaining({
          errorMessage: `The schedule was deleted before the usage-limit resume fired`,
          status: 'cancelled',
        }),
      );
    });

    it('runs a resume run normally when the schedule is still enabled', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(resumeRow());
      vi.mocked(jobsService.findJobById).mockResolvedValue(
        createMock<ScheduledAgentJob>({ enabled: true, ownerUserId: 'u1' }),
      );

      await processor.process(makeJob({ runId: 'run-resume' }));

      expect(runner.run).toHaveBeenCalledOnce();
      expect(jobsService.markRunStarted).toHaveBeenCalled();
    });

    it('still lets Run now execute on a disabled schedule', async () => {
      vi.mocked(jobsService.findRunById).mockResolvedValue(
        createMock<ScheduledAgentJobRun>({ id: 'run-1', trigger: 'manual' }),
      );
      vi.mocked(jobsService.findJobById).mockResolvedValue(
        createMock<ScheduledAgentJob>({ enabled: false }),
      );

      await processor.process(makeJob({ runId: 'run-1' }));

      expect(runner.run).toHaveBeenCalledOnce();
    });
  });

  describe('usage limit', () => {
    const LIMIT = {
      rateLimitType: 'five_hour',
      resetsAt: '2026-11-01T17:00:00.000Z',
    };

    it('records usage_limited (not failed) with the reset columns and hands the run to the resume service', async () => {
      vi.mocked(runner.run).mockResolvedValue(
        result({
          exitCode: 1,
          status: RUN_AGENT_STATUS.failed,
          usageLimit: LIMIT,
        }),
      );

      await processor.process(makeJob());

      expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
        errorMessage: `Usage limit reached (five_hour); resets at 2026-11-01T17:00:00.000Z`,
        exitCode: 1,
        status: 'usage_limited',
        usageLimitResetsAt: new Date('2026-11-01T17:00:00.000Z'),
        usageLimitType: 'five_hour',
        ...NULL_USAGE_COLUMNS,
      });
      expect(usageLimitResume.handle).toHaveBeenCalledExactlyOnceWith({
        limit: LIMIT,
        limitedRunId: 'run-1',
        scheduleId: 'sched-1',
      });
    });

    it('records the run as limited even when the reset time and window are unknown', async () => {
      const unknown = { rateLimitType: null, resetsAt: null };
      vi.mocked(runner.run).mockResolvedValue(
        result({
          exitCode: 1,
          status: RUN_AGENT_STATUS.failed,
          usageLimit: unknown,
        }),
      );

      await processor.process(makeJob());

      expect(jobsService.markRunFinished).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          errorMessage: 'Usage limit reached; reset time unknown',
          status: 'usage_limited',
          usageLimitResetsAt: null,
          usageLimitType: null,
        }),
      );
      expect(usageLimitResume.handle).toHaveBeenCalledOnce();
    });

    it('settles the run before asking the resume service to decide (the chain count must include it)', async () => {
      vi.mocked(runner.run).mockResolvedValue(
        result({
          exitCode: 1,
          status: RUN_AGENT_STATUS.failed,
          usageLimit: LIMIT,
        }),
      );

      await processor.process(makeJob());

      const finishedOrder = vi.mocked(jobsService.markRunFinished).mock
        .invocationCallOrder[0];
      const handleOrder = vi.mocked(usageLimitResume.handle).mock
        .invocationCallOrder[0];
      expect(finishedOrder).toBeLessThan(handleOrder ?? 0);
    });

    it('lets a cancel win over a usage limit', async () => {
      vi.mocked(runner.run).mockResolvedValue(
        result({
          exitCode: null,
          status: RUN_AGENT_STATUS.cancelled,
          usageLimit: LIMIT,
        }),
      );

      await processor.process(makeJob());

      expect(jobsService.markRunFinished).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(usageLimitResume.handle).not.toHaveBeenCalled();
    });

    it('leaves a run with no usage limit on the ordinary exit-code mapping', async () => {
      await processor.process(makeJob());

      expect(usageLimitResume.handle).not.toHaveBeenCalled();
    });

    it('treats a usage_limited run as terminal for the crash safety net', async () => {
      runRepoFindOne.mockResolvedValue({
        id: 'run-9',
        status: 'usage_limited',
      });

      await processor.onJobStalled('bull-9');

      expect(jobsService.markRunFinished).not.toHaveBeenCalled();
    });
  });

  it('streams the agent output to the JSONL sink keyed by queue + bull job id', async () => {
    vi.mocked(runner.run).mockImplementation(async (config) => {
      config.onChunk?.({ data: 'hello', stream: 'stdout' });
      return result({});
    });

    await processor.process(makeJob());

    expect(writer.appendRunChunk).toHaveBeenCalledWith(
      'Scheduled Agent Jobs',
      'bull-1',
      { data: 'hello', source: 'agent', type: 'stdout' },
    );
  });

  it('records a failure without rethrowing when the runner throws', async () => {
    vi.mocked(runner.run).mockRejectedValue(new Error('unknown driver'));

    await expect(processor.process(makeJob())).resolves.toBeUndefined();

    expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
      errorMessage: 'unknown driver',
      exitCode: null,
      status: 'failed',
    });
  });

  it('failed event marks the matching non-terminal run failed (crash safety net)', async () => {
    runRepoFindOne.mockResolvedValue(
      createMock<ScheduledAgentJobRun>({ id: 'run-7', status: 'running' }),
    );

    await processor.onJobFailed(makeJob(), new Error('worker died'));

    expect(runRepoFindOne).toHaveBeenCalledWith({
      where: { bullmqJobId: 'bull-1' },
    });
    expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-7', {
      errorMessage: 'worker died',
      exitCode: null,
      status: 'failed',
    });
  });

  it('failed event no-ops when the run is already terminal', async () => {
    runRepoFindOne.mockResolvedValue(
      createMock<ScheduledAgentJobRun>({ id: 'run-8', status: 'succeeded' }),
    );

    await processor.onJobStalled('bull-1');

    expect(jobsService.markRunFinished).not.toHaveBeenCalled();
    expect(failureNotifier.notify).not.toHaveBeenCalled();
  });

  describe('failure notices', () => {
    it('sends nothing for a successful run', async () => {
      await processor.process(makeJob());

      expect(failureNotifier.notify).not.toHaveBeenCalled();
    });

    it('sends a failed notice for a non-zero exit, after the run is settled', async () => {
      vi.mocked(runner.run).mockResolvedValue(
        result({ exitCode: 2, status: RUN_AGENT_STATUS.failed }),
      );

      await processor.process(makeJob());

      expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith({
        errorMessage: 'Agent exited with code 2',
        reason: 'failed',
        runCount: 1,
        runId: 'run-1',
        scheduledAgentJobId: 'sched-1',
      });
      const settledAt =
        vi.mocked(jobsService.markRunFinished).mock.invocationCallOrder[0] ?? 0;
      const notifiedAt =
        vi.mocked(failureNotifier.notify).mock.invocationCallOrder[0] ?? 0;
      expect(settledAt).toBeLessThan(notifiedAt);
    });

    it('sends a timed_out notice for a timeout', async () => {
      vi.mocked(runner.run).mockResolvedValue(
        result({ exitCode: null, status: RUN_AGENT_STATUS.timeout }),
      );

      await processor.process(makeJob());

      expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          errorMessage: 'Run timed out',
          reason: 'timed_out',
        }),
      );
    });

    it('sends nothing for a cancel, a no_op, or a usage limit', async () => {
      vi.mocked(runner.run)
        .mockResolvedValueOnce(
          result({ exitCode: null, status: RUN_AGENT_STATUS.cancelled }),
        )
        .mockResolvedValueOnce(result({ output: 'OT_RUN_OUTCOME: no_op' }))
        .mockResolvedValueOnce(
          result({
            exitCode: 1,
            status: RUN_AGENT_STATUS.failed,
            usageLimit: { rateLimitType: null, resetsAt: null },
          }),
        );

      await processor.process(makeJob());
      await processor.process(makeJob());
      await processor.process(makeJob());

      expect(failureNotifier.notify).not.toHaveBeenCalled();
    });

    it('sends a failed notice when the runner throws', async () => {
      vi.mocked(runner.run).mockRejectedValue(new Error('unknown driver'));

      await processor.process(makeJob());

      expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          errorMessage: 'unknown driver',
          reason: 'failed',
          runId: 'run-1',
        }),
      );
    });

    it('sends a failed notice from the crash safety net', async () => {
      runRepoFindOne.mockResolvedValue(
        createMock<ScheduledAgentJobRun>({
          id: 'run-7',
          scheduledAgentJobId: 'sched-9',
          status: 'running',
        }),
      );

      await processor.onJobStalled('bull-1');

      expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith({
        errorMessage: 'job stalled',
        reason: 'failed',
        runCount: 1,
        runId: 'run-7',
        scheduledAgentJobId: 'sched-9',
      });
    });
  });

  it('captures the settings snapshot from job.data on the created run row', async () => {
    await processor.process(
      makeJob({
        driverId: 'codex',
        model: 'gpt-5',
        settings: { worktree: { worktree: 'wt-1' } },
      }),
    );

    expect(jobsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        settingsSnapshot: {
          driverId: 'codex',
          model: 'gpt-5',
          settings: { worktree: { worktree: 'wt-1' } },
        },
      }),
    );
  });

  it('parses token usage + cost from the run output and persists it on finish', async () => {
    vi.mocked(runner.run).mockResolvedValue(
      result({ output: CLAUDE_JSONL, status: RUN_AGENT_STATUS.ok }),
    );

    await processor.process(makeJob());

    expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
      cacheReadTokens: 20,
      cacheWriteTokens: 10,
      costUsd: 0.0123,
      errorMessage: null,
      exitCode: 0,
      inputTokens: 100,
      outputTokens: 50,
      rawUsage: expect.objectContaining({
        costUsd: 0.0123,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      }),
      reasoningTokens: null,
      status: 'succeeded',
      totalTokens: 150,
    });
  });

  describe('directory locking', () => {
    it('holds the resolved directory across the run and releases it afterwards', async () => {
      vi.mocked(checkoutPaths.resolve).mockResolvedValue({
        path: process.cwd(),
      });

      await processor.process(
        makeJob({ repositoryCheckoutId: 'checkout-1', timeoutMs: 5_000 }),
      );

      // Bounded by the run's own budget: a run that waited it all out has nothing left to do.
      expect(directoryLock.acquire).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ timeoutMs: 5_000 }),
      );
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('keys a legacy explicit cwd on the same directory a checkout would', async () => {
      // The acceptance criterion an id-based key would have missed: naming one directory two ways
      // must produce one key. The trailing separator is the cheap way to prove normalization.
      await processor.process(makeJob({ cwd: `${process.cwd()}/` }));

      expect(directoryLock.acquire).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
      );
    });

    it('takes no lock for a per-run worktree, so isolated runs never wait', async () => {
      await processor.process(
        makeJob({
          cwd: process.cwd(),
          // claude advertises the worktree capability; flag-only is fresh per invocation.
          settings: { worktree: { worktree: '' } },
        }),
      );

      expect(directoryLock.acquire).toHaveBeenCalledWith(
        null,
        expect.anything(),
      );
    });

    it('still locks the cwd when the driver cannot honor the worktree request', async () => {
      await processor.process(
        makeJob({
          cwd: process.cwd(),
          // codex drops the flag entirely, so the run really does happen in the cwd.
          driverId: 'codex',
          settings: { worktree: { worktree: '' } },
        }),
      );

      expect(directoryLock.acquire).toHaveBeenCalledWith(
        process.cwd(),
        expect.anything(),
      );
    });

    it('releases the directory even when the driver throws', async () => {
      vi.mocked(runner.run).mockRejectedValue(new Error('spawn blew up'));

      await processor.process(makeJob({ cwd: process.cwd() }));

      expect(release).toHaveBeenCalledTimes(1);
      expect(jobsService.markRunFinished).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('fails the run in-band, naming the directory, when the wait times out', async () => {
      vi.mocked(directoryLock.acquire).mockResolvedValue({
        status: 'timeout',
        waitedMs: 900_000,
      });

      await processor.process(makeJob({ cwd: process.cwd() }));

      expect(runner.run).not.toHaveBeenCalled();
      expect(jobsService.markRunFinished).toHaveBeenCalledWith('run-1', {
        errorMessage: expect.stringContaining(process.cwd()),
        exitCode: null,
        status: 'failed',
      });
    });

    it('narrates contention without stopping the run', async () => {
      vi.mocked(directoryLock.acquire).mockImplementation(
        async (
          _key,
          options,
        ): Promise<ScheduledAgentJobDirectoryLockResult> => {
          options.onWait?.(1_000);

          return { lock: { held: true, release }, status: 'held' };
        },
      );

      await processor.process(makeJob({ cwd: process.cwd() }));

      expect(runner.run).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(1);
    });
  });

  describe('misfire policy', () => {
    const MINUTE = 60_000;

    /** A BullMQ job-scheduler fire for a slot `lateByMs` in the past. */
    const makeSchedulerJob = (
      lateByMs: number,
      data: Partial<ScheduledAgentJobBullJob['data']> = {},
    ): { readonly job: ScheduledAgentJobBullJob; readonly slot: Date } => {
      const slot = new Date(Date.now() - lateByMs);

      return {
        job: createMock<ScheduledAgentJobBullJob>({
          data: {
            cwd: process.cwd(),
            driverId: 'claude',
            prompt: 'do it',
            scheduleId: 'sched-1',
            ...data,
          },
          id: `repeat:scheduled-job:sched-1:${slot.getTime()}`,
        }),
        slot,
      };
    };

    const givenPolicy = (
      misfirePolicy: ScheduledAgentJob['misfirePolicy'],
    ): void => {
      vi.mocked(jobsService.findJobById).mockResolvedValue(
        createMock<ScheduledAgentJob>({
          misfirePolicy,
          misfireThresholdMs: 10 * MINUTE,
          ownerUserId: 'user-1',
        }),
      );
    };

    beforeEach(() => {
      vi.mocked(jobsService.claimScheduledSlot).mockResolvedValue(
        createMock<ScheduledAgentJobRun>({ id: 'run-slot' }),
      );
      vi.mocked(jobsService.recordMissedRuns).mockResolvedValue(1);
    });

    describe('when an on-time fire runs', () => {
      it('claims its slot and runs, without reading the policy', async () => {
        const { job, slot } = makeSchedulerJob(2_000);

        await processor.process(job);

        expect(jobsService.findJobById).not.toHaveBeenCalled();
        expect(jobsService.claimScheduledSlot).toHaveBeenCalledWith(
          expect.objectContaining({
            bullmqJobId: job.id,
            scheduledAgentJobId: 'sched-1',
            scheduledFor: slot,
            status: 'running',
          }),
        );
        expect(jobsService.createRun).not.toHaveBeenCalled();
        expect(jobsService.markRunStarted).toHaveBeenCalledWith(
          'run-slot',
          job.id,
          expect.objectContaining({ settingsSnapshot: expect.any(Object) }),
        );
        expect(runner.run).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the policy is skip and the fire is beyond the threshold', () => {
      it('records the slot missed and spawns nothing', async () => {
        givenPolicy('skip');
        const { job, slot } = makeSchedulerJob(42 * MINUTE);

        await processor.process(job);

        expect(jobsService.recordMissedRuns).toHaveBeenCalledWith(
          expect.objectContaining({
            errorMessage: expect.stringContaining('42 min'),
            scheduledAgentJobId: 'sched-1',
            slots: [slot],
          }),
        );
        expect(jobsService.claimScheduledSlot).not.toHaveBeenCalled();
        expect(runner.run).not.toHaveBeenCalled();
        expect(jobRepoUpdate).not.toHaveBeenCalled();
      });

      it('tells the owner the fire was missed', async () => {
        givenPolicy('skip');
        const { job } = makeSchedulerJob(42 * MINUTE);

        await processor.process(job);

        expect(failureNotifier.notify).toHaveBeenCalledExactlyOnceWith({
          errorMessage: expect.stringContaining('42 min'),
          reason: 'missed',
          runCount: 1,
          runId: undefined,
          scheduledAgentJobId: 'sched-1',
        });
      });
    });

    describe('when the policy is skip and the fire is within the threshold', () => {
      it('runs it late', async () => {
        givenPolicy('skip');
        const { job } = makeSchedulerJob(5 * MINUTE);

        await processor.process(job);

        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(runner.run).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the policy is catch_up_once', () => {
      it('runs a fire however late it is', async () => {
        givenPolicy('catch_up_once');
        const { job } = makeSchedulerJob(3 * 24 * 60 * MINUTE);

        await processor.process(job);

        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(runner.run).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the job is the reconcile catch-up', () => {
      it('runs without re-gating, for the slot it names', async () => {
        givenPolicy('skip');
        const slot = new Date(Date.now() - 2 * 60 * MINUTE);

        await processor.process(
          makeJob({ catchUpForSlotMs: slot.getTime(), cwd: process.cwd() }),
        );

        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(jobsService.claimScheduledSlot).toHaveBeenCalledWith(
          expect.objectContaining({ scheduledFor: slot }),
        );
        expect(runner.run).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the slot already has a run', () => {
      it('does not run the fire a second time', async () => {
        vi.mocked(jobsService.claimScheduledSlot).mockResolvedValue(null);
        const { job } = makeSchedulerJob(2_000);

        await processor.process(job);

        expect(runner.run).not.toHaveBeenCalled();
        expect(jobsService.markRunStarted).not.toHaveBeenCalled();
        expect(jobsService.markRunFinished).not.toHaveBeenCalled();
        expect(jobRepoUpdate).not.toHaveBeenCalled();
      });
    });

    describe('when the job is a run-now', () => {
      it('never consults the misfire policy', async () => {
        vi.mocked(jobsService.findRunById).mockResolvedValue(
          createMock<ScheduledAgentJobRun>({
            id: 'run-now',
            trigger: 'manual',
          }),
        );

        await processor.process(
          makeJob({ cwd: process.cwd(), runId: 'run-now' }),
        );

        expect(jobsService.claimScheduledSlot).not.toHaveBeenCalled();
        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(runner.run).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('interval and once fires', () => {
    const MINUTE = 60_000;

    const givenSchedule = (overrides: Partial<ScheduledAgentJob>): void => {
      vi.mocked(jobsService.findJobById).mockResolvedValue(
        createMock<ScheduledAgentJob>({
          enabled: true,
          id: 'sched-1',
          intervalMs: null,
          misfirePolicy: 'skip',
          misfireThresholdMs: 10 * MINUTE,
          ownerUserId: 'user-1',
          runAt: null,
          ...overrides,
        }),
      );
    };

    const fireFor = (slot: Date): ScheduledAgentJobBullJob => {
      return makeJob({ cwd: process.cwd(), slotMs: slot.getTime() });
    };

    beforeEach(() => {
      vi.mocked(jobsService.claimScheduledSlot).mockResolvedValue(
        createMock<ScheduledAgentJobRun>({ id: 'run-slot' }),
      );
      vi.mocked(jobsService.hasLiveScheduledRun).mockResolvedValue(false);
      vi.mocked(jobsService.setJobEnabled).mockResolvedValue(null);
      vi.mocked(jobsService.updateNextRunAt).mockResolvedValue(undefined);
    });

    describe('when an interval fire runs', () => {
      it('claims its slot and arms the next fire from completion', async () => {
        givenSchedule({ intervalMs: 30 * MINUTE, scheduleKind: 'interval' });
        const slot = new Date(Date.now() - 1_000);
        const next = new Date(Date.now() + 30 * MINUTE);
        vi.mocked(scheduler.armSelfScheduledFire).mockResolvedValue(next);

        await processor.process(fireFor(slot));

        expect(jobsService.claimScheduledSlot).toHaveBeenCalledWith(
          expect.objectContaining({ scheduledFor: slot }),
        );
        expect(runner.run).toHaveBeenCalledTimes(1);
        expect(scheduler.armSelfScheduledFire).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'sched-1' }),
          { lastFinishedAt: expect.any(Date) },
        );
        expect(jobsService.updateNextRunAt).toHaveBeenCalledWith(
          'sched-1',
          next,
        );
      });
    });

    describe('when an interval fire is hours late', () => {
      it('runs it once, ignoring the misfire policy', async () => {
        givenSchedule({ intervalMs: 30 * MINUTE, scheduleKind: 'interval' });

        await processor.process(
          fireFor(new Date(Date.now() - 5 * 60 * MINUTE)),
        );

        expect(jobsService.recordMissedRuns).not.toHaveBeenCalled();
        expect(runner.run).toHaveBeenCalledTimes(1);
      });
    });

    describe('when another fire of the interval schedule is still running', () => {
      it('drops this fire without a run row or a re-arm', async () => {
        givenSchedule({ intervalMs: 30 * MINUTE, scheduleKind: 'interval' });
        vi.mocked(jobsService.hasLiveScheduledRun).mockResolvedValue(true);

        await processor.process(fireFor(new Date()));

        expect(jobsService.claimScheduledSlot).not.toHaveBeenCalled();
        expect(runner.run).not.toHaveBeenCalled();
        expect(scheduler.armSelfScheduledFire).not.toHaveBeenCalled();
      });
    });

    describe('when the schedule was disabled after the fire was armed', () => {
      it('drops the fire', async () => {
        givenSchedule({
          enabled: false,
          intervalMs: 30 * MINUTE,
          scheduleKind: 'interval',
        });

        await processor.process(fireFor(new Date()));

        expect(runner.run).not.toHaveBeenCalled();
      });
    });

    describe('when the schedule changed back to cron', () => {
      it('drops the fire', async () => {
        givenSchedule({ cronPattern: '0 9 * * *', scheduleKind: 'cron' });

        await processor.process(fireFor(new Date()));

        expect(runner.run).not.toHaveBeenCalled();
      });
    });

    describe('when a once fire runs at its time', () => {
      it('runs and then disables the schedule', async () => {
        const runAt = new Date(Date.now() - 1_000);
        givenSchedule({ runAt, scheduleKind: 'once' });

        await processor.process(fireFor(runAt));

        expect(runner.run).toHaveBeenCalledTimes(1);
        expect(jobsService.setJobEnabled).toHaveBeenCalledWith(
          'sched-1',
          false,
        );
        expect(jobsService.updateNextRunAt).toHaveBeenCalledWith(
          'sched-1',
          null,
        );
        expect(scheduler.armSelfScheduledFire).not.toHaveBeenCalled();
      });
    });

    describe('when a once schedule was moved to another time', () => {
      it('drops the fire for the old time', async () => {
        givenSchedule({
          runAt: new Date(Date.now() + 60 * MINUTE),
          scheduleKind: 'once',
        });

        await processor.process(fireFor(new Date()));

        expect(runner.run).not.toHaveBeenCalled();
      });
    });

    describe('when arming the next interval fire fails', () => {
      it('still finishes the run', async () => {
        givenSchedule({ intervalMs: 30 * MINUTE, scheduleKind: 'interval' });
        vi.mocked(scheduler.armSelfScheduledFire).mockRejectedValue(
          new Error('redis down'),
        );

        await expect(
          processor.process(fireFor(new Date())),
        ).resolves.toBeUndefined();

        expect(jobsService.markRunFinished).toHaveBeenCalledWith(
          'run-slot',
          expect.objectContaining({ status: 'succeeded' }),
        );
      });
    });
  });
});

describe('foldRunUsage', () => {
  it('folds token counts + cost out of a claude stream-json run (nested assistant usage ignored)', () => {
    const folded = foldRunUsage(CLAUDE_JSONL);

    expect(folded).toEqual({
      cacheReadTokens: 20,
      cacheWriteTokens: 10,
      costUsd: 0.0123,
      inputTokens: 100,
      model: 'claude-opus-4',
      outputTokens: 50,
      totalTokens: 150,
    });
  });

  it('sums an opencode-style multi-line mid-stream usage stream', () => {
    const opencode = [
      JSON.stringify({ cost: 0.01, tokens: { input: 10, output: 5 } }),
      JSON.stringify({ cost: 0.02, tokens: { input: 20, output: 7 } }),
    ].join('\n');

    expect(foldRunUsage(opencode)).toEqual(
      expect.objectContaining({
        costUsd: expect.closeTo(0.03, 5),
        inputTokens: 30,
        outputTokens: 12,
      }),
    );
  });

  it('returns null for empty, non-JSON, or usage-free output (never throws)', () => {
    expect(foldRunUsage('')).toBeNull();
    expect(
      foldRunUsage('not json at all\n<promise>ERROR</promise>'),
    ).toBeNull();
    expect(
      foldRunUsage(JSON.stringify({ result: 'hi', type: 'result' })),
    ).toBeNull();
  });
});

describe('parseRunOutcome', () => {
  it('returns null when the job did not opt into the convention', () => {
    expect(parseRunOutcome('I did the work and filed a plan.')).toBeNull();
  });

  it('reads a no_op verdict', () => {
    expect(parseRunOutcome('Stopped.\nOT_RUN_OUTCOME: no_op')).toBe('no_op');
  });

  it('reads a completed verdict', () => {
    expect(
      parseRunOutcome('Filed 3 findings.\nOT_RUN_OUTCOME: completed'),
    ).toBe('completed');
  });

  it('tolerates no space and trailing whitespace after the colon', () => {
    expect(parseRunOutcome('OT_RUN_OUTCOME:no_op')).toBe('no_op');
    expect(parseRunOutcome('OT_RUN_OUTCOME: no_op   ')).toBe('no_op');
  });

  it('lets the last verdict win, so a prompt quoting the protocol cannot outvote the agent', () => {
    const output = [
      'Emit OT_RUN_OUTCOME: completed when you finish.',
      'I could not reach openthrottle-mcp.',
      'OT_RUN_OUTCOME: no_op',
    ].join('\n');

    expect(parseRunOutcome(output)).toBe('no_op');
  });

  it('ignores the token mid-line so prose cannot trip it', () => {
    expect(
      parseRunOutcome(
        'The agent should print OT_RUN_OUTCOME: no_op at the end.',
      ),
    ).toBeNull();
  });

  it('ignores an unknown verdict value', () => {
    expect(parseRunOutcome('OT_RUN_OUTCOME: maybe')).toBeNull();
  });
});
