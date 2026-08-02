import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Optional } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import {
  hasUsageCounts,
  normalizeUsage,
  sumUsage,
  type NormalizedTokenUsage,
} from '@openthrottle/agentic-token-usage';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  RUN_AGENT_STATUS,
  type RunAgentStatus,
} from '@openthrottle/openthrottle-drivers';
import {
  ScheduledAgentJobsService,
  type ScheduledAgentJobRunSettingsSnapshot,
  type ScheduledAgentJobRunStatus,
} from '@openthrottle/nestjs-repositories';
import { closeRunOutputForJob } from '../bullmq-keyed-run-logging';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service';
import { BULLMQ_RUN_OUTPUT_WRITER } from '../bullmq-run-output-writer.token';
import { ScheduledAgentJobCancellationService } from './scheduled-agent-job-cancellation.service';
import { ScheduledAgentRunnerService } from './scheduled-agent-runner.service';
import {
  resolveScheduledAgentJobCwd,
  resolveScheduledAgentJobTimeoutMs,
  SCHEDULED_AGENT_JOB_OUTPUT_SOURCE,
  SCHEDULED_AGENT_JOBS_CONCURRENCY,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants';
import type { ScheduledAgentJobBullJob } from './scheduled-agent-jobs.types';

/** Run-status terminal states — a run in one of these is done and must not be re-marked. */
const TERMINAL_RUN_STATUSES: ReadonlySet<ScheduledAgentJobRunStatus> = new Set([
  'cancelled',
  'failed',
  'succeeded',
]);

/** @description Maps a driver {@link RunAgentStatus} to the persisted run status. */
const runStatusForAgentStatus = (
  status: RunAgentStatus,
): ScheduledAgentJobRunStatus => {
  switch (status) {
    case RUN_AGENT_STATUS.ok:
      return 'succeeded';
    case RUN_AGENT_STATUS.cancelled:
      return 'cancelled';
    default:
      return 'failed';
  }
};

/**
 * @description Fold token usage out of a run's buffered CLI output. The output is JSONL (one event
 * per line for stream-json backends; opencode emits several mid-stream usage lines), so each line is
 * run through the shared {@link normalizeUsage} and accumulated with {@link sumUsage} — the same fold
 * `ConversationStreamService.persistTurnUsage` does, but over raw buffered text instead of discrete
 * usage events. Defensive by contract: `normalizeUsage`/`sumUsage` never throw on bad/partial input,
 * the whole fold is guarded, and a run that reported no counts folds to `null` (nothing to persist).
 */
export const foldRunUsage = (output: string): NormalizedTokenUsage | null => {
  try {
    const folded = output
      .split('\n')
      .reduce<NormalizedTokenUsage>(
        (accumulated, line) =>
          line.trim() === ''
            ? accumulated
            : sumUsage(accumulated, normalizeUsage(line)),
        {},
      );

    return hasUsageCounts(folded) ? folded : null;
  } catch {
    return null;
  }
};

/** @description The persisted usage columns derived from a folded run usage (all null when absent). */
const usageColumns = (
  usage: NormalizedTokenUsage | null,
): {
  readonly cacheReadTokens: number | null;
  readonly cacheWriteTokens: number | null;
  readonly costUsd: number | null;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly rawUsage: Record<string, unknown> | null;
  readonly reasoningTokens: number | null;
  readonly totalTokens: number | null;
} => ({
  cacheReadTokens: usage?.cacheReadTokens ?? null,
  cacheWriteTokens: usage?.cacheWriteTokens ?? null,
  costUsd: usage?.costUsd ?? null,
  inputTokens: usage?.inputTokens ?? null,
  outputTokens: usage?.outputTokens ?? null,
  rawUsage: usage === null ? null : { ...usage },
  reasoningTokens: usage?.reasoningTokens ?? null,
  totalTokens: usage?.totalTokens ?? null,
});

/** @description Human error detail for a non-ok agent status; null for a clean run. */
const errorMessageForAgentStatus = (
  status: RunAgentStatus,
  exitCode: number | null,
): string | null => {
  switch (status) {
    case RUN_AGENT_STATUS.ok:
      return null;
    case RUN_AGENT_STATUS.cancelled:
      return 'Run cancelled';
    case RUN_AGENT_STATUS.timeout:
      return 'Run timed out';
    case RUN_AGENT_STATUS.spawnError:
      return 'Agent failed to start';
    default:
      return `Agent exited with code ${exitCode ?? 'unknown'}`;
  }
};

/**
 * @description Worker for the single generic scheduled-agent-jobs queue. Decodes a run snapshot,
 * claims/creates its run row, streams the agent CLI's output to the JSONL sink (consumed by
 * queueJobLogs/queueJobLogTail), runs it via {@link ScheduledAgentRunnerService} (→ drivers
 * `runAgentPrompt`) under a per-run AbortSignal, and records the terminal status + exit code. The run
 * row is authoritative; `failed`/`stalled` events are a crash safety net so nothing stays `running`.
 * Modeled on `PlansProcessor`, minus the Ralph/plan specifics.
 */
@Processor(SCHEDULED_AGENT_JOBS_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: SCHEDULED_AGENT_JOBS_CONCURRENCY,
})
export class ScheduledAgentJobsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly runner: ScheduledAgentRunnerService,
    private readonly cancellation: ScheduledAgentJobCancellationService,
    private readonly retention: BullMqRunOutputRetentionService,
    @Optional()
    @Inject(BULLMQ_RUN_OUTPUT_WRITER)
    private readonly writer: KeyedJsonlWriter | undefined,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Scheduled-agent-jobs worker shutting down (signal=${signal ?? 'unknown'})`,
      ScheduledAgentJobsProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: ScheduledAgentJobBullJob): Promise<void> {
    const {
      cwd,
      driverId,
      model,
      prompt,
      runId,
      scheduleId,
      settings,
      timeoutMs,
    } = job.data;
    const queueName = SCHEDULED_AGENT_JOBS_QUEUE_NAME;
    const bullmqJobId = String(job.id);

    // Snapshot the effective run settings at fire time so later schedule edits don't rewrite this
    // run's history. driver/model/run-config is all a scheduled job carries today (no reasoning
    // tier / permission mode in the schedule model); `settings` holds any endpoint/worktree knobs.
    const settingsSnapshot: ScheduledAgentJobRunSettingsSnapshot = {
      driverId,
      model: model ?? null,
      settings: settings ?? null,
    };

    const runRowId = await this.claimOrCreateRun(runId, {
      bullmqJobId,
      driverId,
      model: model ?? null,
      scheduleId,
      settingsSnapshot,
    });

    const signal = this.cancellation.attach(runRowId);

    try {
      const result = await this.runner.run({
        cwd: resolveScheduledAgentJobCwd(cwd),
        driverId,
        model: model ?? undefined,
        onChunk: (chunk) => {
          this.writer?.appendRunChunk(queueName, bullmqJobId, {
            data: chunk.data,
            source: SCHEDULED_AGENT_JOB_OUTPUT_SOURCE,
            type: chunk.stream,
          });
        },
        prompt,
        settings: settings ?? undefined,
        signal,
        timeoutMs: resolveScheduledAgentJobTimeoutMs(timeoutMs),
      });

      await this.jobsService.markRunFinished(runRowId, {
        errorMessage: errorMessageForAgentStatus(
          result.status,
          result.exitCode,
        ),
        exitCode: result.exitCode,
        status: runStatusForAgentStatus(result.status),
        ...usageColumns(foldRunUsage(result.output)),
      });
    } catch (error) {
      // runAgentPrompt only throws on invalid input (unknown driver / capability mismatch); an
      // unexpected DB error can also land here. Record the run as failed in-band; do NOT rethrow, so
      // the run row (authoritative) carries the failure without a BullMQ retry (attempts: 1).
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Scheduled agent job ${scheduleId} run ${runRowId} failed: ${message}`,
        ScheduledAgentJobsProcessor.name,
      );
      await this.jobsService.markRunFinished(runRowId, {
        errorMessage: message,
        exitCode: null,
        status: 'failed',
      });
    } finally {
      this.cancellation.detach(runRowId);
      await this.jobsService
        .getJobRepository()
        .update({ id: scheduleId }, { lastRunAt: new Date() });
      await closeRunOutputForJob({
        jobId: bullmqJobId,
        logLabel: ScheduledAgentJobsProcessor.name,
        logger: this.logger,
        queueName,
        writer: this.writer,
      });
      this.retention.maybePruneAfterJobClose();
    }
  }

  /**
   * @description Claims a pre-created run row (run-now) or creates one (scheduled fire); both end up
   * `running` with `bullmq_job_id` set. Returns the run row id.
   */
  private async claimOrCreateRun(
    runId: string | null | undefined,
    input: {
      readonly bullmqJobId: string;
      readonly driverId: ScheduledAgentJobBullJob['data']['driverId'];
      readonly model: string | null;
      readonly scheduleId: string;
      readonly settingsSnapshot: ScheduledAgentJobRunSettingsSnapshot;
    },
  ): Promise<string> {
    if (typeof runId === 'string' && runId.length > 0) {
      const existing = await this.jobsService.findRunById(runId);
      if (existing !== null) {
        // Run-now row was pre-created by the enqueuer; backfill the snapshot as it starts.
        await this.jobsService.markRunStarted(
          existing.id,
          input.bullmqJobId,
          input.settingsSnapshot,
        );
        return existing.id;
      }
    }

    const created = await this.jobsService.createRun({
      bullmqJobId: input.bullmqJobId,
      driverId: input.driverId,
      model: input.model,
      scheduledAgentJobId: input.scheduleId,
      settingsSnapshot: input.settingsSnapshot,
      status: 'running',
      trigger: 'schedule',
    });
    await this.jobsService.markRunStarted(created.id, input.bullmqJobId);
    return created.id;
  }

  @OnWorkerEvent('failed')
  async onJobFailed(
    payload:
      | ScheduledAgentJobBullJob
      | { error?: Error; job?: ScheduledAgentJobBullJob },
    errorArg?: Error,
  ): Promise<void> {
    const job = 'data' in payload ? payload : payload.job;
    const error = ('error' in payload && payload.error) || errorArg;
    await this.failRunByBullmqJobId(
      job?.id === undefined ? undefined : String(job.id),
      error?.message ?? 'job failed',
    );
  }

  @OnWorkerEvent('stalled')
  async onJobStalled(bullmqJobId: string): Promise<void> {
    await this.failRunByBullmqJobId(bullmqJobId, 'job stalled');
  }

  /**
   * @description Crash safety net: mark the run for a BullMQ job failed unless already terminal. Keyed
   * by bullmq_job_id (set at run start), so it covers both run-now and scheduled-fire runs even when
   * the worker died before `process()` could record a status.
   */
  private async failRunByBullmqJobId(
    bullmqJobId: string | undefined,
    reason: string,
  ): Promise<void> {
    if (bullmqJobId === undefined) {
      return;
    }

    const run = await this.jobsService
      .getRunRepository()
      .findOne({ where: { bullmqJobId } });
    if (run === null || TERMINAL_RUN_STATUSES.has(run.status)) {
      return;
    }

    await this.jobsService.markRunFinished(run.id, {
      errorMessage: reason,
      exitCode: null,
      status: 'failed',
    });
  }
}
