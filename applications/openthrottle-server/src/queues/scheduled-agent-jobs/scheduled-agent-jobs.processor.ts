import { stat } from 'node:fs/promises';
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
  DRIVER_REGISTRY,
  RUN_AGENT_STATUS,
  type RunAgentStatus,
} from '@openthrottle/openthrottle-drivers';
import {
  ScheduledAgentJobCheckoutPathService,
  ScheduledAgentJobsService,
  type ScheduledAgentJobRunSettingsSnapshot,
  type ScheduledAgentJobRunStatus,
} from '@openthrottle/nestjs-repositories';
import { closeRunOutputForJob } from '../bullmq-keyed-run-logging';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service';
import { BULLMQ_RUN_OUTPUT_WRITER } from '../bullmq-run-output-writer.token';
import { ScheduledAgentJobCancellationService } from './scheduled-agent-job-cancellation.service';
import { ScheduledAgentJobDirectoryLockService } from './scheduled-agent-job-directory-lock.service';
import { ScheduledAgentRunnerService } from './scheduled-agent-runner.service';
import {
  resolveScheduledAgentJobConcurrencyKey,
  resolveScheduledAgentJobRunCwd,
  resolveScheduledAgentJobsConcurrency,
  resolveScheduledAgentJobTimeoutMs,
  SCHEDULED_AGENT_JOB_OUTPUT_SOURCE,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants';
import type { ScheduledAgentJobBullJob } from './scheduled-agent-jobs.types';

/** Run-status terminal states — a run in one of these is done and must not be re-marked. */
const TERMINAL_RUN_STATUSES: ReadonlySet<ScheduledAgentJobRunStatus> = new Set([
  'cancelled',
  'failed',
  'no_op',
  'succeeded',
]);

/**
 * Machine token a job's prompt can instruct its agent to emit as the last thing it prints, so a run
 * that did no work stops reporting as a clean success.
 *
 * An agent CLI exits 0 whenever the model produced a turn — including a turn that explicitly
 * declined the task — so the process exit code cannot distinguish "did the work" from "refused".
 * Nor can the CLI's own structured result event: a decline is still a completed turn as far as the
 * CLI is concerned. The only party that knows whether the work happened is the agent, so it has to
 * say so, and it has to say so in a token rather than in prose.
 *
 * This is deliberately an OPT-IN convention, not prose sniffing: a job that says nothing about
 * OT_RUN_OUTCOME keeps exactly its previous mapping, so no existing job or historical row changes
 * meaning. Matching is anchored to a line and case-sensitive; the LAST occurrence wins, so a prompt
 * that quotes the protocol while explaining it cannot outvote the agent's real verdict.
 */
const RUN_OUTCOME_SENTINEL =
  /^OT_RUN_OUTCOME:[ \t]*(completed|no_op)[ \t]*$/gmu;

/**
 * @description Reads the last OT_RUN_OUTCOME sentinel from a run's buffered output. Returns `null`
 * when the job did not opt into the convention, which means "no claim either way" — callers must
 * then fall back to the exit-code mapping rather than assume either outcome.
 */
export const parseRunOutcome = (
  output: string,
): 'completed' | 'no_op' | null => {
  const matches = [...output.matchAll(RUN_OUTCOME_SENTINEL)];
  const last = matches[matches.length - 1]?.[1];

  return last === 'completed' || last === 'no_op' ? last : null;
};

/**
 * @description Maps a driver {@link RunAgentStatus} to the persisted run status, letting an
 * agent-emitted {@link parseRunOutcome} verdict override a clean exit.
 *
 * The override is only ever applied to `ok`: a run that timed out, was cancelled, or exited non-zero
 * is already being reported honestly, and a sentinel printed before a crash must not upgrade it.
 */
const runStatusForAgentStatus = (
  status: RunAgentStatus,
  outcome: 'completed' | 'no_op' | null = null,
): ScheduledAgentJobRunStatus => {
  switch (status) {
    case RUN_AGENT_STATUS.ok:
      return outcome === 'no_op' ? 'no_op' : 'succeeded';
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
  concurrency: resolveScheduledAgentJobsConcurrency(),
})
export class ScheduledAgentJobsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly checkoutPaths: ScheduledAgentJobCheckoutPathService,
    private readonly runner: ScheduledAgentRunnerService,
    private readonly cancellation: ScheduledAgentJobCancellationService,
    private readonly directoryLock: ScheduledAgentJobDirectoryLockService,
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
      repositoryCheckoutId,
      runId,
      scheduleId,
      settings,
      timeoutMs,
    } = job.data;
    const queueName = SCHEDULED_AGENT_JOBS_QUEUE_NAME;
    const bullmqJobId = String(job.id);

    const target = await this.resolveRunTarget(
      scheduleId,
      repositoryCheckoutId,
      cwd,
    );

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
      repositoryCheckoutId: target.repositoryCheckoutId,
      resolvedCwd: target.cwd,
      scheduleId,
      settingsSnapshot,
    });

    // A schedule whose targeted checkout no longer resolves keeps running, from the payload's
    // fallback path — but say so loudly, because that path is not the one the user picked.
    if (target.checkoutMissing) {
      this.logger.warn(
        `Scheduled agent job ${scheduleId} targets checkout ${repositoryCheckoutId ?? 'unknown'} which no longer resolves; falling back to ${target.cwd}`,
        ScheduledAgentJobsProcessor.name,
      );
    }

    const signal = this.cancellation.attach(runRowId);

    try {
      // The ladder always yields *a* path (process.cwd() last resort), so the only way to be sure the
      // run can do anything useful is to check the directory exists. Failing here — rather than
      // letting the CLI spawn in a missing/renamed directory and report an opaque driver error — is
      // what makes "the checkout moved" legible in the run's error_message.
      await this.assertUsableCwd(target, repositoryCheckoutId);

      const runTimeoutMs = resolveScheduledAgentJobTimeoutMs(timeoutMs);

      // Worker concurrency is > 1, so two runs can reach the same directory at once — which is the
      // git-index race the old concurrency of 1 existed to prevent. Take the directory before the CLI
      // spawns, keyed so that unrelated checkouts never wait on each other. Acquired AFTER the cwd
      // check (locking a directory that does not exist buys nothing) and after the cancel signal is
      // attached, so a user can cancel a run that is queued behind a neighbour.
      const concurrencyKey = this.concurrencyKeyFor(
        target.cwd,
        driverId,
        settings,
      );
      const acquisition = await this.directoryLock.acquire(concurrencyKey, {
        onWait: () => {
          this.logger.info(
            `Scheduled agent job ${scheduleId} run ${runRowId} is waiting for ${concurrencyKey ?? target.cwd}; another run holds it`,
            ScheduledAgentJobsProcessor.name,
          );
        },
        signal,
        // Bounded by the run's own timeout: a run that spent its whole budget waiting has nothing
        // left to do with the directory anyway, and an unbounded wait would pin a worker slot.
        timeoutMs: runTimeoutMs,
      });

      if (acquisition.status === 'timeout') {
        throw new Error(
          `Timed out after ${acquisition.waitedMs}ms waiting for ${target.cwd}, which another scheduled run is using.`,
        );
      }

      try {
        const result = await this.runner.run({
          cwd: target.cwd,
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
          timeoutMs: runTimeoutMs,
        });

        await this.jobsService.markRunFinished(runRowId, {
          errorMessage: errorMessageForAgentStatus(
            result.status,
            result.exitCode,
          ),
          exitCode: result.exitCode,
          status: runStatusForAgentStatus(
            result.status,
            parseRunOutcome(result.output),
          ),
          ...usageColumns(foldRunUsage(result.output)),
        });
      } finally {
        // Release before the outer bookkeeping so the next run for this directory is not held up by
        // this run's log flush and retention pass.
        await acquisition.lock.release();
      }
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
   * @description The directory identity this run must not share, or `null` when it needs no
   * serialisation. Reads the driver's `worktree` capability from the registry rather than assuming it:
   * a schedule can ask codex or opencode for a worktree, and those drivers silently drop the flag, so
   * the run really does land in the cwd.
   */
  private concurrencyKeyFor(
    cwd: string,
    driverId: ScheduledAgentJobBullJob['data']['driverId'],
    settings: ScheduledAgentJobBullJob['data']['settings'],
  ): string | null {
    return resolveScheduledAgentJobConcurrencyKey({
      cwd,
      driverSupportsWorktree:
        DRIVER_REGISTRY[driverId]?.capabilities.worktree ?? false,
      worktree: settings?.worktree?.worktree,
    });
  }

  /**
   * @description Resolves where this run should execute, and what to record about it.
   *
   * A scheduler payload is a snapshot that can be arbitrarily stale — a checkout can be moved,
   * renamed, or deleted months after the scheduler was upserted — so when the payload names a
   * checkout we re-resolve it here (one indexed read per run) instead of trusting the path baked into
   * the payload. The schedule row supplies the `owner_user_id` the resolution is scoped to; it is
   * never taken from the payload.
   */
  private async resolveRunTarget(
    scheduleId: string,
    repositoryCheckoutId: string | null | undefined,
    payloadCwd: string | null | undefined,
  ): Promise<{
    readonly checkoutMissing: boolean;
    readonly cwd: string;
    readonly repositoryCheckoutId: string | null;
  }> {
    const checkoutId =
      typeof repositoryCheckoutId === 'string' && repositoryCheckoutId !== ''
        ? repositoryCheckoutId
        : null;

    if (checkoutId === null) {
      return {
        checkoutMissing: false,
        cwd: resolveScheduledAgentJobRunCwd({ explicitCwd: payloadCwd }),
        repositoryCheckoutId: null,
      };
    }

    const schedule = await this.jobsService.findJobById(scheduleId);
    const resolved = await this.checkoutPaths.resolve({
      checkoutId,
      ownerUserId: schedule?.ownerUserId ?? null,
    });

    if ('path' in resolved) {
      return {
        checkoutMissing: false,
        cwd: resolveScheduledAgentJobRunCwd({
          checkoutPath: resolved.path,
          explicitCwd: payloadCwd,
        }),
        repositoryCheckoutId: checkoutId,
      };
    }

    // Checkout gone: keep the run alive on the payload's fallback path. The id is still recorded on
    // the run row so the history says what was *intended*, and the FK is ON DELETE SET NULL so a
    // truly deleted checkout nulls out there rather than blocking the insert.
    return {
      checkoutMissing: true,
      cwd: resolveScheduledAgentJobRunCwd({ explicitCwd: payloadCwd }),
      repositoryCheckoutId: null,
    };
  }

  /**
   * @description Fails the run in-band when the resolved directory is not usable, with a message that
   * names the targeted checkout when there was one. Throws so `process()`'s catch records it.
   */
  private async assertUsableCwd(
    target: {
      readonly checkoutMissing: boolean;
      readonly cwd: string;
      readonly repositoryCheckoutId: string | null;
    },
    requestedCheckoutId: string | null | undefined,
  ): Promise<void> {
    const usable = await stat(target.cwd)
      .then((entry) => entry.isDirectory())
      .catch(() => false);
    if (usable) return;

    throw new Error(
      target.checkoutMissing
        ? `Targeted repository checkout ${requestedCheckoutId ?? 'unknown'} could not be resolved (deleted, or no longer owned by this schedule's owner), and the fallback directory ${target.cwd} does not exist.`
        : `Working directory ${target.cwd} does not exist.`,
    );
  }

  /**
   * @description Claims a pre-created run row (run-now) or creates one (scheduled fire); both end up
   * `running` with `bullmq_job_id` set, carrying the fire-time provenance (settings snapshot, targeted
   * checkout, resolved cwd). Returns the run row id.
   */
  private async claimOrCreateRun(
    runId: string | null | undefined,
    input: {
      readonly bullmqJobId: string;
      readonly driverId: ScheduledAgentJobBullJob['data']['driverId'];
      readonly model: string | null;
      readonly repositoryCheckoutId: string | null;
      readonly resolvedCwd: string;
      readonly scheduleId: string;
      readonly settingsSnapshot: ScheduledAgentJobRunSettingsSnapshot;
    },
  ): Promise<string> {
    if (typeof runId === 'string' && runId.length > 0) {
      const existing = await this.jobsService.findRunById(runId);
      if (existing !== null) {
        // Run-now row was pre-created by the enqueuer; backfill the snapshot as it starts.
        await this.jobsService.markRunStarted(existing.id, input.bullmqJobId, {
          repositoryCheckoutId: input.repositoryCheckoutId,
          resolvedCwd: input.resolvedCwd,
          settingsSnapshot: input.settingsSnapshot,
        });
        return existing.id;
      }
    }

    const created = await this.jobsService.createRun({
      bullmqJobId: input.bullmqJobId,
      driverId: input.driverId,
      model: input.model,
      repositoryCheckoutId: input.repositoryCheckoutId,
      resolvedCwd: input.resolvedCwd,
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
