import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type ScheduledAgentJobRun,
  type ScheduledAgentJobRunSettingsSnapshot,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import { DRIVER_REGISTRY } from '@openthrottle/openthrottle-drivers';
import { SCHEDULED_RUN_FAILURE_REASONS } from '@openthrottle/openthrottle-notifications';
import type { Queue } from 'bullmq';

import { resolveRepeatablesOwner } from '../repeatable-job.owner.ts';
import { ScheduledAgentJobDirectoryLockService } from './scheduled-agent-job-directory-lock.service.ts';
import { ScheduledAgentJobFailureNotifierService } from './scheduled-agent-job-failure-notifier.service.ts';
import {
  resolveScheduledAgentJobConcurrencyKey,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants.ts';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types.ts';

/** The error_message a recovered run carries, so run history says why it stopped. */
export const SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE = `Server restarted while this run was in progress; the run was abandoned.`;

/** Upper bound on runs examined per boot, so a corrupt table cannot stall startup. */
const STUCK_RUN_RECOVERY_BATCH_SIZE = 200;

/** What one boot recovery did, for the log line and for tests. */
export interface ScheduledAgentJobStuckRunRecoverySummary {
  readonly examined: number;
  readonly locksReleased: number;
  readonly recovered: number;
  readonly skippedLive: number;
}

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null;
};

/**
 * @description The `settings.worktree.worktree` value the processor keyed the run's directory lock
 * on, read back out of the run's settings snapshot. Undefined when the snapshot has none.
 */
const readSnapshotWorktree = (
  snapshot: ScheduledAgentJobRunSettingsSnapshot | null,
): string | null | undefined => {
  const settings = snapshot?.['settings'];
  if (!isRecord(settings)) return undefined;

  const worktree = settings['worktree'];
  if (!isRecord(worktree)) return undefined;

  const name = worktree['worktree'];
  if (name === null) return null;

  return typeof name === 'string' ? name : undefined;
};

/**
 * @description The directory-lock key the processor took for `run`, derived the same way the
 * processor derives it, or null when the run had no directory to lock (no resolved cwd recorded, or
 * a flag-only worktree run).
 */
const directoryLockKeyForRun = (run: ScheduledAgentJobRun): string | null => {
  if (run.resolvedCwd === null) {
    return null;
  }

  return resolveScheduledAgentJobConcurrencyKey({
    cwd: run.resolvedCwd,
    driverSupportsWorktree:
      DRIVER_REGISTRY[run.driverId]?.capabilities.worktree ?? false,
    worktree: readSnapshotWorktree(run.settingsSnapshot),
  });
};

/**
 * @description Boot-time recovery for scheduled-agent-job runs left `running` by a crash. A SIGKILL,
 * an OOM or a power loss skips every in-process path that finishes a run, so the row stays
 * `running` forever and the per-directory lock it held blocks that directory until its TTL lapses.
 *
 * At boot this finds every `running` row and asks BullMQ whether anything still owns it. A run is
 * live while its BullMQ job lock exists in Redis, because a worker renews that lock for as long as it
 * is processing the job. A run with no lock, or no BullMQ job id at all, has no process behind it:
 * the row is marked `failed` with {@link SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE}, and the
 * directory lock is deleted unless a live run shares that directory.
 *
 * A run whose lock is still held is left alone, even though the holder may be the process that
 * just died: a quick restart can come back before the lock's TTL expires. BullMQ's stalled check
 * catches that case once the lock lapses, and the processor's `stalled` handler fails the row. This
 * service covers what that handler cannot see: a job that is gone from Redis or was never attached,
 * a row whose terminal write failed, and a queue that was emptied.
 *
 * This mirrors the plan-run stale sweep, with one difference: it runs once per boot, not on a timer,
 * because scheduled runs have no heartbeat to go stale between boots. Gated by
 * {@link resolveRepeatablesOwner}, like the boot reconcile, because a shared-DB worktree has its own
 * queue prefix. From there every primary-owned run would look abandoned.
 */
@Injectable()
export class ScheduledAgentJobStuckRunRecoveryService implements OnApplicationBootstrap {
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly directoryLock: ScheduledAgentJobDirectoryLockService,
    @InjectQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME)
    private readonly queue: Queue<ScheduledAgentJobPayload, void>,
    private readonly failureNotifier: ScheduledAgentJobFailureNotifierService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Scheduled-agent-jobs stuck-run recovery skipped: ${ownership.reason}`,
        ScheduledAgentJobStuckRunRecoveryService.name,
      );
      return;
    }

    try {
      await this.recover();
    } catch (error) {
      // Recovery is housekeeping: a failure here must never stop the server from booting.
      this.logger.warn(
        `Scheduled-agent-jobs stuck-run recovery failed: ${error instanceof Error ? error.message : String(error)}`,
        ScheduledAgentJobStuckRunRecoveryService.name,
      );
    }
  }

  /**
   * @description Fails every `running` run with no live BullMQ job behind it and releases the
   * directory locks those runs held. Idempotent: the status-guarded update makes a second pass, or a
   * run that finished in between, a no-op.
   */
  async recover(): Promise<ScheduledAgentJobStuckRunRecoverySummary> {
    const running = await this.jobsService.getRunRepository().find({
      order: { createdAt: 'ASC' },
      take: STUCK_RUN_RECOVERY_BATCH_SIZE,
      where: { status: 'running' },
    });

    const liveness = await Promise.all(
      running.map(async (run) => ({ live: await this.isLive(run), run })),
    );
    const live = liveness.filter((entry) => entry.live).map((e) => e.run);
    const abandoned = liveness
      .filter((entry) => !entry.live)
      .map((entry) => entry.run);

    const failed = await Promise.all(
      abandoned.map(async (run) => ({
        recovered: await this.failAbandonedRun(run),
        run,
      })),
    );
    const recoveredRuns = failed
      .filter((entry) => entry.recovered)
      .map((entry) => entry.run);

    const locksReleased = await this.releaseAbandonedLocks(recoveredRuns, live);

    await Promise.all(
      recoveredRuns.map((run) =>
        this.failureNotifier.notify({
          errorMessage: SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE,
          reason: SCHEDULED_RUN_FAILURE_REASONS.FAILED,
          runCount: 1,
          runId: run.id,
          scheduledAgentJobId: run.scheduledAgentJobId,
        }),
      ),
    );

    const summary: ScheduledAgentJobStuckRunRecoverySummary = {
      examined: running.length,
      locksReleased,
      recovered: recoveredRuns.length,
      skippedLive: live.length,
    };

    this.logger.info(
      `Scheduled-agent-jobs stuck-run recovery: examined=${summary.examined}, recovered=${summary.recovered}, skippedLive=${summary.skippedLive}, locksReleased=${summary.locksReleased}`,
      ScheduledAgentJobStuckRunRecoveryService.name,
    );

    return summary;
  }

  /**
   * @description Whether a worker still holds the BullMQ job lock for `run`. A Redis error answers
   * "live": when in doubt, leave the row for the stalled handler rather than fail a real run.
   */
  private async isLive(run: ScheduledAgentJobRun): Promise<boolean> {
    if (run.bullmqJobId === null) {
      return false;
    }

    try {
      const client = await this.queue.client;
      const lockKey = `${this.queue.toKey(run.bullmqJobId)}:lock`;

      // BullMQ's client interface exposes GET but not EXISTS; the token itself is not needed.
      return (await client.get(lockKey)) !== null;
    } catch (error) {
      this.logger.warn(
        `Could not check the BullMQ lock for scheduled run ${run.id} (${error instanceof Error ? error.message : String(error)}); leaving it running`,
        ScheduledAgentJobStuckRunRecoveryService.name,
      );

      return true;
    }
  }

  /**
   * @description Marks one abandoned run failed. Guarded on `status = 'running'` so a run that
   * finished between the read and this write keeps its real outcome. Returns whether it was updated.
   */
  private async failAbandonedRun(run: ScheduledAgentJobRun): Promise<boolean> {
    const result = await this.jobsService.getRunRepository().update(
      { id: run.id, status: 'running' },
      {
        errorMessage: SCHEDULED_AGENT_JOB_SERVER_RESTARTED_MESSAGE,
        exitCode: null,
        finishedAt: new Date(),
        status: 'failed',
      },
    );

    const recovered = (result.affected ?? 0) > 0;
    if (recovered) {
      this.logger.info(
        `Marked scheduled run ${run.id} (schedule ${run.scheduledAgentJobId}) failed: no live process after a server restart`,
        ScheduledAgentJobStuckRunRecoveryService.name,
      );
    }

    return recovered;
  }

  /**
   * @description Deletes the directory lock of each recovered run, except where a live run maps to
   * the same directory: that run may hold the lock now, and deleting it would let a third run in.
   */
  private async releaseAbandonedLocks(
    recovered: readonly ScheduledAgentJobRun[],
    live: readonly ScheduledAgentJobRun[],
  ): Promise<number> {
    const liveKeys = new Set(live.map(directoryLockKeyForRun));
    const keys = new Set(
      recovered
        .map(directoryLockKeyForRun)
        .filter((key): key is string => key !== null && !liveKeys.has(key)),
    );

    const released = await Promise.all(
      [...keys].map((key) => this.directoryLock.forceRelease(key)),
    );

    return released.filter(Boolean).length;
  }
}
