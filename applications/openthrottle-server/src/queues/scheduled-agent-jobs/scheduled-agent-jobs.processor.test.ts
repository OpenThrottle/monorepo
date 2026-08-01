import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  RUN_AGENT_STATUS,
  type RunAgentPromptResult,
} from '@openthrottle/openthrottle-drivers';
import {
  ScheduledAgentJobsService,
  type ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service';
import { ScheduledAgentJobCancellationService } from './scheduled-agent-job-cancellation.service';
import { ScheduledAgentJobsProcessor } from './scheduled-agent-jobs.processor';
import { ScheduledAgentRunnerService } from './scheduled-agent-runner.service';
import type { ScheduledAgentJobBullJob } from './scheduled-agent-jobs.types';

const result = (
  overrides: Partial<RunAgentPromptResult>,
): RunAgentPromptResult => ({
  driverId: 'claude',
  exitCode: 0,
  output: '',
  status: RUN_AGENT_STATUS.ok,
  ...overrides,
});

const makeJob = (
  data: Partial<ScheduledAgentJobBullJob['data']> = {},
): ScheduledAgentJobBullJob =>
  createMock<ScheduledAgentJobBullJob>({
    data: {
      driverId: 'claude',
      prompt: 'do it',
      scheduleId: 'sched-1',
      ...data,
    },
    id: 'bull-1',
  });

describe('ScheduledAgentJobsProcessor', () => {
  let jobsService: ScheduledAgentJobsService;
  let runner: ScheduledAgentRunnerService;
  let cancellation: ScheduledAgentJobCancellationService;
  let retention: BullMqRunOutputRetentionService;
  let writer: KeyedJsonlWriter;
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
      findRunById: vi.fn().mockResolvedValue(null),
      getJobRepository: vi.fn().mockReturnValue({ update: jobRepoUpdate }),
      getRunRepository: vi.fn().mockReturnValue({ findOne: runRepoFindOne }),
      markRunFinished: vi.fn().mockResolvedValue(undefined),
      markRunStarted: vi.fn().mockResolvedValue(undefined),
    });

    runner = createMock<ScheduledAgentRunnerService>({
      run: vi.fn().mockResolvedValue(result({})),
    });

    cancellation = createMock<ScheduledAgentJobCancellationService>({
      attach: vi.fn().mockReturnValue(new AbortController().signal),
      detach: vi.fn(),
    });
    retention = createMock<BullMqRunOutputRetentionService>();
    writer = createMock<KeyedJsonlWriter>();

    processor = new ScheduledAgentJobsProcessor(
      createMock<LoggerService>(),
      jobsService,
      runner,
      cancellation,
      retention,
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
    });
    expect(jobRepoUpdate).toHaveBeenCalledWith(
      { id: 'sched-1' },
      expect.objectContaining({ lastRunAt: expect.any(Date) }),
    );
    expect(cancellation.detach).toHaveBeenCalledWith('run-1');
  });

  it('claims a pre-created run row for run-now instead of creating one', async () => {
    vi.mocked(jobsService.findRunById).mockResolvedValue(
      createMock<ScheduledAgentJobRun>({ id: 'run-now-9' }),
    );

    await processor.process(makeJob({ runId: 'run-now-9' }));

    expect(jobsService.findRunById).toHaveBeenCalledWith('run-now-9');
    expect(jobsService.createRun).not.toHaveBeenCalled();
    expect(jobsService.markRunStarted).toHaveBeenCalledWith(
      'run-now-9',
      'bull-1',
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
    });

    vi.mocked(runner.run).mockResolvedValueOnce(
      result({ exitCode: null, status: RUN_AGENT_STATUS.cancelled }),
    );
    await processor.process(makeJob());
    expect(jobsService.markRunFinished).toHaveBeenLastCalledWith('run-1', {
      errorMessage: 'Run cancelled',
      exitCode: null,
      status: 'cancelled',
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
  });
});
