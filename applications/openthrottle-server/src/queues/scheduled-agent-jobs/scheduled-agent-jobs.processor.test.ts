import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  RUN_AGENT_STATUS,
  type RunAgentPromptResult,
} from '@openthrottle/openthrottle-drivers';
import {
  ScheduledAgentJobCheckoutPathService,
  ScheduledAgentJobsService,
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service';
import { ScheduledAgentJobCancellationService } from './scheduled-agent-job-cancellation.service';
import {
  foldRunUsage,
  parseRunOutcome,
  ScheduledAgentJobsProcessor,
} from './scheduled-agent-jobs.processor';
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
  let checkoutPaths: ScheduledAgentJobCheckoutPathService;
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
    retention = createMock<BullMqRunOutputRetentionService>();
    writer = createMock<KeyedJsonlWriter>();

    processor = new ScheduledAgentJobsProcessor(
      createMock<LoggerService>(),
      jobsService,
      checkoutPaths,
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
      retention,
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
      retention,
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
      retention,
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
