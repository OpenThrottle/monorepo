import { stat } from 'node:fs/promises';

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Inject, Optional } from '@nestjs/common';
import {
  hasUsageCounts,
  type NormalizedTokenUsage,
  normalizeUsage,
  sumUsage,
} from '@openthrottle/agentic-token-usage';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import type { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type ScheduledAgentJob,
  ScheduledAgentJobCheckoutPathService,
  type ScheduledAgentJobRunSettingsSnapshot,
  type ScheduledAgentJobRunStatus,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import {
  DRIVER_REGISTRY,
  RUN_AGENT_STATUS,
  type RunAgentStatus,
  type UsageLimit,
} from '@openthrottle/openthrottle-drivers';
import { SCHEDULED_RUN_FAILURE_REASONS } from '@openthrottle/openthrottle-notifications';

import { closeRunOutputForJob } from '../bullmq-keyed-run-logging.ts';
import { BullMqRunOutputRetentionService } from '../bullmq-run-output-retention.service.ts';
import { BULLMQ_RUN_OUTPUT_WRITER } from '../bullmq-run-output-writer.token.ts';
import { ScheduledAgentJobCancellationService } from './scheduled-agent-job-cancellation.service.ts';
import { ScheduledAgentJobDirectoryLockService } from './scheduled-agent-job-directory-lock.service.ts';
import { ScheduledAgentJobFailureNotifierService } from './scheduled-agent-job-failure-notifier.service.ts';
import { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service.ts';
import {
  resolveScheduledAgentJobConcurrencyKey,
  resolveScheduledAgentJobRunCwd,
  resolveScheduledAgentJobsConcurrency,
  resolveScheduledAgentJobTimeoutMs,
  SCHEDULED_AGENT_JOB_OUTPUT_SOURCE,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants.ts';
import {
  missedOnPickupMessage,
  SCHEDULED_AGENT_JOB_MISFIRE_MIN_THRESHOLD_MS,
  shouldRunLateFire,
  slotMillisFromJobId,
} from './scheduled-agent-jobs.misfire.ts';
import { isSelfScheduledKind } from './scheduled-agent-jobs.schedule-kind.ts';
import type {
  ScheduledAgentJobBullJob,
  ScheduledAgentJobPayload,
} from './scheduled-agent-jobs.types.ts';
import { ScheduledAgentRunnerService } from './scheduled-agent-runner.service.ts';
import { ScheduledAgentJobUsageLimitResumeService } from './usage-limit-resume/usage-limit-resume.service.ts';

/** Run-status terminal states — a run in one of these is done and must not be re-marked. */
const TERMINAL_RUN_STATUSES: ReadonlySet<ScheduledAgentJobRunStatus> = new Set([
  'cancelled',
  'failed',
  'missed',
  'no_op',
  'succeeded',
  'usage_limited',
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
 * @description Error detail recorded on a run that stopped on a Claude subscription usage limit,
 * naming the window and the reset time when the CLI reported them.
 */
const errorMessageForUsageLimit = (limit: UsageLimit): string => {
  const window =
    limit.rateLimitType === null ? '' : ` (${limit.rateLimitType})`;
  const hasResetTime = limit.resetsAt !== null;
  const knownReset = `resets at ${limit.resetsAt}`;
  const reset = hasResetTime ? knownReset : 'reset time unknown';

  return `Usage limit reached${window}; ${reset}`;
};

/** @description The reset instant as a Date, or null when absent or unparseable. */
const parseResetInstant = (limit: UsageLimit): Date | null => {
  if (limit.resetsAt === null) {
    return null;
  }

  const parsed = new Date(limit.resetsAt);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
      .reduce<NormalizedTokenUsage>((accumulated, line) => {
        if (line.trim() === '') return accumulated;
        return sumUsage(accumulated, normalizeUsage(line));
      }, {});

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
} => {
  return {
    cacheReadTokens: usage?.cacheReadTokens ?? null,
    cacheWriteTokens: usage?.cacheWriteTokens ?? null,
    costUsd: usage?.costUsd ?? null,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    rawUsage: usage === null ? null : { ...usage },
    reasoningTokens: usage?.reasoningTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
  };
};

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
    private readonly usageLimitResume: ScheduledAgentJobUsageLimitResumeService,
    private readonly retention: BullMqRunOutputRetentionService,
    private readonly scheduler: ScheduledAgentJobSchedulerService,
    private readonly failureNotifier: ScheduledAgentJobFailureNotifierService,
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

    if (await this.skipResumeOfInactiveSchedule(runId, scheduleId)) {
      return;
    }

    if (await this.skipStaleSelfScheduledFire(job.data)) {
      return;
    }

    const slot = this.slotFor(job);
    if (slot !== null && (await this.skipLateFire(job.data, slot))) {
      return;
    }

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
      scheduledFor: slot,
      settingsSnapshot,
    });

    // The slot already has a row: BullMQ delivered this fire twice (a stalled re-queue), or the boot
    // reconcile recorded it missed / ran it as the outage's catch-up first. One run per slot.
    if (runRowId === null) {
      this.logger.info(
        `Scheduled agent job ${scheduleId}: slot ${slot?.toISOString() ?? 'unknown'} already has a run; not running BullMQ job ${bullmqJobId} again`,
        ScheduledAgentJobsProcessor.name,
      );
      return;
    }

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
      // Read the durable cancel marker only AFTER the abort signal is attached: a cancel that lands
      // from here on aborts the signal, and one that landed before (while the job was moving to
      // active, when there was no controller to abort and the queued job could not be removed) left
      // the marker this read sees. Either way the agent never spawns for a cancelled run.
      if (await this.finishIfCancelRequested(runRowId, scheduleId)) {
        return;
      }

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

        // A usage limit outranks the exit-code mapping (the CLI exits non-zero when it is stopped by
        // one) but never a cancel: the user stopping the run is the more specific fact.
        const wasCancelled = result.status === RUN_AGENT_STATUS.cancelled;
        const usageLimit = wasCancelled ? null : result.usageLimit;

        if (usageLimit === null) {
          const errorMessage = errorMessageForAgentStatus(
            result.status,
            result.exitCode,
          );
          const status = runStatusForAgentStatus(
            result.status,
            parseRunOutcome(result.output),
          );
          await this.jobsService.markRunFinished(runRowId, {
            errorMessage,
            exitCode: result.exitCode,
            status,
            ...usageColumns(foldRunUsage(result.output)),
          });
          if (status === 'failed') {
            const isTimeout = result.status === RUN_AGENT_STATUS.timeout;
            const { FAILED, TIMED_OUT } = SCHEDULED_RUN_FAILURE_REASONS;
            await this.failureNotifier.notify({
              errorMessage,
              reason: isTimeout ? TIMED_OUT : FAILED,
              runCount: 1,
              runId: runRowId,
              scheduledAgentJobId: scheduleId,
            });
          }
        } else {
          await this.jobsService.markRunFinished(runRowId, {
            errorMessage: errorMessageForUsageLimit(usageLimit),
            exitCode: result.exitCode,
            status: 'usage_limited',
            usageLimitResetsAt: parseResetInstant(usageLimit),
            usageLimitType: usageLimit.rateLimitType,
            ...usageColumns(foldRunUsage(result.output)),
          });
          // Never throws, so the limited job completes normally and BullMQ does not retry it.
          await this.usageLimitResume.handle({
            limit: usageLimit,
            limitedRunId: runRowId,
            scheduleId,
          });
        }
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
      await this.failureNotifier.notify({
        errorMessage: message,
        reason: SCHEDULED_RUN_FAILURE_REASONS.FAILED,
        runCount: 1,
        runId: runRowId,
        scheduledAgentJobId: scheduleId,
      });
    } finally {
      this.cancellation.detach(runRowId);
      const finishedAt = new Date();
      await this.jobsService
        .getJobRepository()
        .update({ id: scheduleId }, { lastRunAt: finishedAt });
      if (typeof job.data.slotMs === 'number') {
        await this.afterSelfScheduledFire(scheduleId, finishedAt);
      }
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
   * @description Closes the cancel-at-claim race: when the claimed run already carries
   * `cancel_requested_at`, finishes it `cancelled` without spawning the agent and returns true.
   */
  private async finishIfCancelRequested(
    runRowId: string,
    scheduleId: string,
  ): Promise<boolean> {
    const run = await this.jobsService.findRunById(runRowId);
    if (!(run?.cancelRequestedAt instanceof Date)) {
      return false;
    }

    this.logger.info(
      `Scheduled agent job ${scheduleId}: run ${runRowId} was cancelled before it started; not spawning the agent.`,
      ScheduledAgentJobsProcessor.name,
    );
    await this.jobsService.markRunFinished(runRowId, {
      errorMessage: 'Run cancelled',
      exitCode: null,
      status: 'cancelled',
    });

    return true;
  }

  /**
   * @description A usage-limit resume was decided (and delayed) while its schedule was enabled; the
   * user may have disabled or deleted the schedule during the wait. Re-reads the schedule before the
   * claim and, when it is gone or disabled, finishes the pre-created resume run `cancelled` — the
   * user stopped it, the agent never ran, so `no_op` (which means "the agent ran and did nothing")
   * would misreport it — without spawning anything. Returns true when the run was skipped.
   *
   * Only resume runs are checked: Run now is deliberately allowed on a disabled schedule. A missing
   * run row with a missing schedule is a deleted schedule (the run FK cascades), so that is skipped
   * too rather than failing later on the run insert.
   */
  private async skipResumeOfInactiveSchedule(
    runId: string | null | undefined,
    scheduleId: string,
  ): Promise<boolean> {
    if (typeof runId !== 'string' || runId.length === 0) {
      return false;
    }

    const existing = await this.jobsService.findRunById(runId);
    if (existing !== null && existing.trigger !== 'resume') {
      return false;
    }

    const schedule = await this.jobsService.findJobById(scheduleId);
    if (schedule?.enabled === true) {
      return false;
    }

    const deletedReason = `The schedule was deleted before the usage-limit resume fired`;
    const disabledReason = `The schedule was disabled before the usage-limit resume fired`;
    const reason = schedule === null ? deletedReason : disabledReason;

    this.logger.info(
      `Scheduled agent job ${scheduleId}: skipping resume run ${runId}. ${reason}.`,
      ScheduledAgentJobsProcessor.name,
    );

    if (existing !== null) {
      await this.jobsService.markRunFinished(existing.id, {
        errorMessage: reason,
        exitCode: null,
        status: 'cancelled',
      });
    }

    return true;
  }

  /**
   * @description Drops an interval or once fire that no longer matches its schedule, without a run
   * row: the schedule was deleted, disabled, or changed kind, a once schedule's `runAt` moved, or an
   * interval fire is already running. Arming removes the previous pending fire, so this is the
   * backstop for one that slipped past (it was mid-promotion, or an edit landed while a fire ran).
   * A running interval fire re-arms the chain when it finishes, so dropping this one loses nothing.
   * Returns true when the fire was dropped. Every other job returns false without a read.
   */
  private async skipStaleSelfScheduledFire(
    data: ScheduledAgentJobPayload,
  ): Promise<boolean> {
    if (typeof data.slotMs !== 'number') return false;

    const schedule = await this.jobsService.findJobById(data.scheduleId);
    const reason = await this.staleSelfScheduledFireReason(
      schedule,
      data.slotMs,
    );
    if (reason === null) return false;

    this.logger.info(
      `Scheduled agent job ${data.scheduleId}: dropping the fire for ${new Date(data.slotMs).toISOString()}: ${reason}`,
      ScheduledAgentJobsProcessor.name,
    );

    return true;
  }

  /** @description Why an interval/once fire for `slotMs` is stale, or null when it should run. */
  private async staleSelfScheduledFireReason(
    schedule: ScheduledAgentJob | null,
    slotMs: number,
  ): Promise<string | null> {
    if (schedule === null) return 'the schedule was deleted';
    if (!schedule.enabled) return 'the schedule is disabled';
    if (!isSelfScheduledKind(schedule.scheduleKind)) {
      return 'the schedule is no longer an interval or once schedule';
    }
    if (schedule.scheduleKind === 'once') {
      return schedule.runAt?.getTime() === slotMs
        ? null
        : 'the schedule now runs at a different time';
    }

    const isRunning = await this.jobsService.hasLiveScheduledRun({
      createdSince: new Date(Date.now() - process.uptime() * 1_000),
      excludeRunId: null,
      scheduledAgentJobId: schedule.id,
    });

    return isRunning
      ? 'a fire of this schedule is still running; it re-arms the next one when it finishes'
      : null;
  }

  /**
   * @description Settles an interval or once schedule after one of its fires finished, whatever the
   * outcome: an interval arms its next fire `intervalMs` from now (counted from completion), and a
   * once schedule is disabled — it has fired. Never throws: it runs in the processor's `finally`, and
   * a failure is logged; the next boot reconcile re-arms an interval whose chain broke.
   */
  private async afterSelfScheduledFire(
    scheduleId: string,
    finishedAt: Date,
  ): Promise<void> {
    try {
      const schedule = await this.jobsService.findJobById(scheduleId);
      if (schedule === null || !schedule.enabled) return;

      if (schedule.scheduleKind === 'once') {
        await this.jobsService.setJobEnabled(scheduleId, false);
        await this.jobsService.updateNextRunAt(scheduleId, null);
        return;
      }

      if (schedule.scheduleKind !== 'interval') return;

      const next = await this.scheduler.armSelfScheduledFire(schedule, {
        lastFinishedAt: finishedAt,
      });
      await this.jobsService.updateNextRunAt(scheduleId, next);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Scheduled agent job ${scheduleId}: could not arm the next fire: ${message}`,
        ScheduledAgentJobsProcessor.name,
      );
    }
  }

  /**
   * @description The cron slot this job fires for, or null when it is not a scheduled fire. A run-now
   * or resume job (it carries a pre-created `runId`) has none; the reconcile's catch-up names its slot
   * in the payload; a BullMQ scheduler job carries it in its id (`repeat:<key>:<slotMillis>`).
   */
  private slotFor(job: ScheduledAgentJobBullJob): Date | null {
    const { catchUpForSlotMs, runId, slotMs } = job.data;
    if (typeof runId === 'string' && runId.length > 0) return null;

    if (typeof catchUpForSlotMs === 'number') return new Date(catchUpForSlotMs);
    if (typeof slotMs === 'number') return new Date(slotMs);

    const millis = slotMillisFromJobId(
      job.id === undefined ? undefined : String(job.id),
    );

    return millis === null ? null : new Date(millis);
  }

  /**
   * @description The processor half of the misfire policy: a scheduler fire picked up later than its
   * job's threshold, under `skip`, is recorded as a `missed` run and not spawned. Returns true when the
   * fire was skipped.
   *
   * Lives here rather than only in the boot reconcile because whether BullMQ's one surviving overdue
   * job runs at boot is a race the reconcile cannot win reliably; gating at pickup makes the policy
   * hold either way, and also covers a queue backed up behind the per-directory lock. The reconcile's
   * own catch-up already applied the policy, so it is never re-gated. Fires within the minimum
   * threshold skip the schedule read entirely: no policy can skip them.
   */
  private async skipLateFire(
    data: ScheduledAgentJobPayload,
    slot: Date,
  ): Promise<boolean> {
    const latenessMs = Date.now() - slot.getTime();
    const isCatchUp = typeof data.catchUpForSlotMs === 'number';
    // An interval or once fire is never gated: one the server was down for runs once, late.
    const isSelfScheduled = typeof data.slotMs === 'number';
    if (
      isCatchUp ||
      isSelfScheduled ||
      latenessMs <= SCHEDULED_AGENT_JOB_MISFIRE_MIN_THRESHOLD_MS
    ) {
      return false;
    }

    const schedule = await this.jobsService.findJobById(data.scheduleId);
    if (schedule === null) return false;

    const policy = {
      policy: schedule.misfirePolicy,
      thresholdMs: schedule.misfireThresholdMs,
    };
    if (shouldRunLateFire({ latenessMs, ...policy })) return false;

    const errorMessage = missedOnPickupMessage({ latenessMs, ...policy });
    const recorded = await this.jobsService.recordMissedRuns({
      driverId: data.driverId,
      errorMessage,
      model: data.model ?? null,
      scheduledAgentJobId: data.scheduleId,
      slots: [slot],
    });
    // Zero means the slot already had a row (a duplicate delivery), which was already reported.
    await this.failureNotifier.notify({
      errorMessage,
      reason: SCHEDULED_RUN_FAILURE_REASONS.MISSED,
      runCount: recorded,
      runId: undefined,
      scheduledAgentJobId: data.scheduleId,
    });
    this.logger.info(
      `Scheduled agent job ${data.scheduleId}: fire for ${slot.toISOString()} is ${Math.round(latenessMs / 1_000)}s late, beyond its ${policy.thresholdMs}ms misfire threshold; recorded as missed`,
      ScheduledAgentJobsProcessor.name,
    );

    return true;
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
    const hasCheckoutId =
      typeof repositoryCheckoutId === 'string' && repositoryCheckoutId !== '';
    const checkoutId = hasCheckoutId ? repositoryCheckoutId : null;

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
   * checkout, resolved cwd). Returns the run row id, or null when the fire's cron slot already has a
   * row — the slot is claimed through a unique index, so each slot runs at most once.
   */
  private async claimOrCreateRun(
    runId: string | null | undefined,
    input: {
      readonly bullmqJobId: string;
      readonly driverId: ScheduledAgentJobBullJob['data']['driverId'];
      readonly model: string | null;
      readonly repositoryCheckoutId: string | null;
      readonly resolvedCwd: string;
      readonly scheduledFor: Date | null;
      readonly scheduleId: string;
      readonly settingsSnapshot: ScheduledAgentJobRunSettingsSnapshot;
    },
  ): Promise<string | null> {
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

    if (input.scheduledFor !== null) {
      const claimed = await this.jobsService.claimScheduledSlot({
        bullmqJobId: input.bullmqJobId,
        driverId: input.driverId,
        model: input.model,
        repositoryCheckoutId: input.repositoryCheckoutId,
        resolvedCwd: input.resolvedCwd,
        scheduledAgentJobId: input.scheduleId,
        scheduledFor: input.scheduledFor,
        status: 'running',
      });
      if (claimed === null) return null;

      await this.jobsService.markRunStarted(claimed.id, input.bullmqJobId, {
        settingsSnapshot: input.settingsSnapshot,
      });
      return claimed.id;
    }

    // A fire with no readable slot (a job id from before slot accounting) keeps the old path.
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
    await this.failureNotifier.notify({
      errorMessage: reason,
      reason: SCHEDULED_RUN_FAILURE_REASONS.FAILED,
      runCount: 1,
      runId: run.id,
      scheduledAgentJobId: run.scheduledAgentJobId,
    });
  }
}
