/**
 * @description Repository/service for scheduled_agent_jobs + scheduled_agent_job_runs. Owns typed
 * persistence access; scheduling (BullMQ), validation, and the GraphQL surface live in the server.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Repository } from 'typeorm';

import { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import type { ScheduledAgentJobRunStatus } from './scheduled-agent-job-run.entity.ts';
import {
  SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES,
  ScheduledAgentJobRun,
} from './scheduled-agent-job-run.entity.ts';
import type {
  ClaimScheduledAgentJobSlotInput,
  CreateScheduledAgentJobInput,
  CreateScheduledAgentJobRunInput,
  FinishScheduledAgentJobRunInput,
  RecordMissedScheduledAgentJobRunsInput,
  ScheduledAgentJobRunStatusCount,
  StartScheduledAgentJobRunInput,
  UpdateScheduledAgentJobInput,
} from './scheduled-agent-jobs.types.ts';
import { schedulerKeyForJob } from './scheduled-agent-jobs.utils.ts';
/** One `missed` row as inserted; no jsonb columns, so it fits a raw bulk insert. */
type MissedScheduledAgentJobRunRow = Pick<
  ScheduledAgentJobRun,
  | 'driverId'
  | 'errorMessage'
  | 'finishedAt'
  | 'model'
  | 'scheduledAgentJobId'
  | 'scheduledFor'
  | 'status'
  | 'trigger'
>;
/** @description The `id` of the first row a raw `INSERT ... RETURNING id` handed back, or null. */
const firstReturnedId = (raw: unknown): string | null => {
  if (!Array.isArray(raw)) return null;

  const first: unknown = raw[0];
  if (typeof first !== 'object' || first === null || !('id' in first)) {
    return null;
  }

  return typeof first.id === 'string' ? first.id : null;
};

@Injectable()
export class ScheduledAgentJobsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(ScheduledAgentJob)
    private readonly jobRepository: Repository<ScheduledAgentJob>,
    @InjectRepository(ScheduledAgentJobRun)
    private readonly runRepository: Repository<ScheduledAgentJobRun>,
  ) {
    this.logger.debug('🧩 scheduled-agent-jobs 🧩');
  }

  /** @description TypeORM repository for scheduled_agent_jobs (audit/advanced queries). */
  getJobRepository(): Repository<ScheduledAgentJob> {
    return this.jobRepository;
  }

  /** @description TypeORM repository for scheduled_agent_job_runs (audit/advanced queries). */
  getRunRepository(): Repository<ScheduledAgentJobRun> {
    return this.runRepository;
  }

  /** @description Create a schedule row, deriving the stable scheduler key from the generated id. */
  async createJob(
    input: CreateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob> {
    const draft = this.jobRepository.create({
      cronPattern: input.cronPattern,
      cwd: input.cwd ?? null,
      driverId: input.driverId,
      enabled: input.enabled ?? true,
      intervalMs: input.intervalMs ?? null,
      ...(input.misfirePolicy === undefined
        ? {}
        : { misfirePolicy: input.misfirePolicy }),
      ...(input.misfireThresholdMs === undefined
        ? {}
        : { misfireThresholdMs: input.misfireThresholdMs }),
      model: input.model ?? null,
      name: input.name,
      ownerUserId: input.ownerUserId ?? null,
      prompt: input.prompt,
      repositoryCheckoutId: input.repositoryCheckoutId ?? null,
      runAt: input.runAt ?? null,
      ...(input.scheduleKind === undefined
        ? {}
        : { scheduleKind: input.scheduleKind }),
      // Temporary placeholder; replaced with the id-derived key after insert.
      schedulerKey: 'pending',
      settings: input.settings ?? {},
      timeoutMs: input.timeoutMs ?? null,
      timezone: input.timezone ?? null,
    });

    const saved = await this.jobRepository.save(draft);
    saved.schedulerKey = schedulerKeyForJob(saved.id);
    return this.jobRepository.save(saved);
  }

  /** @description Find one schedule by id, or null. */
  async findJobById(id: string): Promise<ScheduledAgentJob | null> {
    return this.jobRepository.findOne({ where: { id } });
  }

  /** @description List schedules, newest first; optionally scoped to an owner. */
  async listJobs(ownerUserId?: string): Promise<ScheduledAgentJob[]> {
    return this.jobRepository.find({
      order: { createdAt: 'DESC' },
      ...(ownerUserId === undefined ? {} : { where: { ownerUserId } }),
    });
  }

  /** @description All enabled schedules — the reconciler's boot-time source of truth. */
  async listEnabledJobs(): Promise<ScheduledAgentJob[]> {
    return this.jobRepository.find({ where: { enabled: true } });
  }

  /** @description Apply a partial update and return the fresh row, or null when absent. */
  async updateJob(
    id: string,
    input: UpdateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob | null> {
    const existing = await this.findJobById(id);
    if (existing === null) return null;

    this.jobRepository.merge(existing, input);
    return this.jobRepository.save(existing);
  }

  /** @description Toggle enablement; returns the fresh row, or null when absent. */
  async setJobEnabled(
    id: string,
    enabled: boolean,
  ): Promise<ScheduledAgentJob | null> {
    return this.updateJob(id, { enabled });
  }

  /** @description Set the cached next-run time from the BullMQ scheduler. Best-effort. */
  async updateNextRunAt(id: string, nextRunAt: Date | null): Promise<void> {
    await this.jobRepository.update({ id }, { nextRunAt });
  }

  /** @description Delete a schedule (runs cascade via FK). Returns whether a row was removed. */
  async deleteJob(id: string): Promise<boolean> {
    const result = await this.jobRepository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  /** @description Open a run row. */
  async createRun(
    input: CreateScheduledAgentJobRunInput,
  ): Promise<ScheduledAgentJobRun> {
    const draft = this.runRepository.create({
      bullmqJobId: input.bullmqJobId ?? null,
      driverId: input.driverId,
      model: input.model ?? null,
      repositoryCheckoutId: input.repositoryCheckoutId ?? null,
      resolvedCwd: input.resolvedCwd ?? null,
      resumeOfRunId: input.resumeOfRunId ?? null,
      scheduledAgentJobId: input.scheduledAgentJobId,
      scheduledFor: input.scheduledFor ?? null,
      settingsSnapshot: input.settingsSnapshot ?? null,
      status: input.status ?? 'queued',
      trigger: input.trigger,
    });
    return this.runRepository.save(draft);
  }

  /**
   * @description Opens the run row for one cron slot, or returns null when that slot already has a
   * row. `INSERT ... ON CONFLICT DO NOTHING` against the partial unique index on
   * (scheduled_agent_job_id, scheduled_for) (migration 141), so the boot reconcile and the worker
   * can race for a slot and exactly one of them wins. Always a `schedule`-trigger row.
   */
  async claimScheduledSlot(
    input: ClaimScheduledAgentJobSlotInput,
  ): Promise<ScheduledAgentJobRun | null> {
    const result = await this.runRepository
      .createQueryBuilder()
      .insert()
      .into(ScheduledAgentJobRun)
      .values({
        bullmqJobId: input.bullmqJobId ?? null,
        driverId: input.driverId,
        model: input.model ?? null,
        repositoryCheckoutId: input.repositoryCheckoutId ?? null,
        resolvedCwd: input.resolvedCwd ?? null,
        resumeOfRunId: input.resumeOfRunId ?? null,
        scheduledAgentJobId: input.scheduledAgentJobId,
        scheduledFor: input.scheduledFor,
        status: input.status ?? 'queued',
        trigger: 'schedule',
      })
      .orIgnore()
      .returning(['id'])
      .execute();

    const id = firstReturnedId(result.raw);

    return id === null ? null : this.findRunById(id);
  }

  /**
   * @description Records cron slots the misfire policy did not run as terminal `missed` runs, one per
   * slot, skipping any slot that already has a row (a run, or an earlier missed record). Returns how
   * many rows were inserted. No agent is spawned for these, so they carry no bullmq job id.
   */
  async recordMissedRuns(
    input: RecordMissedScheduledAgentJobRunsInput,
  ): Promise<number> {
    if (input.slots.length === 0) return 0;

    const finishedAt = new Date();
    const result = await this.runRepository
      .createQueryBuilder()
      .insert()
      .into(ScheduledAgentJobRun)
      .values(
        input.slots.map((slot): MissedScheduledAgentJobRunRow => ({
          driverId: input.driverId,
          errorMessage: input.errorMessage,
          finishedAt,
          model: input.model,
          scheduledAgentJobId: input.scheduledAgentJobId,
          scheduledFor: slot,
          status: 'missed',
          trigger: 'schedule',
        })),
      )
      .orIgnore()
      .returning(['id'])
      .execute();

    return Array.isArray(result.raw) ? result.raw.length : 0;
  }

  /**
   * @description The latest cron slot recorded for a schedule (any status, missed included) among
   * rows created before `createdBefore`, or null when there is none. The boot reconcile's "accounted
   * for up to here" anchor; `createdBefore` (the process start) keeps a late fire the worker picked
   * up during this boot from moving the anchor past the slots it is meant to account for.
   */
  async findLatestScheduledFor(
    scheduledAgentJobId: string,
    createdBefore: Date,
  ): Promise<Date | null> {
    const row = await this.runRepository
      .createQueryBuilder('run')
      .select('MAX(run.scheduled_for)', 'latest')
      .where('run.scheduled_agent_job_id = :scheduledAgentJobId', {
        scheduledAgentJobId,
      })
      .andWhere(`run.trigger = 'schedule'`)
      .andWhere('run.created_at < :createdBefore', { createdBefore })
      .getRawOne<{ latest: Date | string | null }>();

    const latest = row?.latest ?? null;

    return latest === null ? null : new Date(latest);
  }

  /**
   * @description Whether a real (not `missed`) run was opened at or after `since` for a slot that was
   * already due before `since` — i.e. the worker picked up BullMQ's one surviving overdue job during
   * this boot, so that run IS the outage's catch-up and no second one is owed.
   */
  async hasLateRunSince(
    scheduledAgentJobId: string,
    since: Date,
  ): Promise<boolean> {
    const count = await this.runRepository
      .createQueryBuilder('run')
      .where('run.scheduled_agent_job_id = :scheduledAgentJobId', {
        scheduledAgentJobId,
      })
      .andWhere(`run.trigger = 'schedule'`)
      .andWhere(`run.status <> 'missed'`)
      .andWhere('run.created_at >= :since', { since })
      .andWhere('run.scheduled_for < :since', { since })
      .getCount();

    return count > 0;
  }

  /**
   * @description Whether a schedule already has a `schedule`-trigger row for `slot` (a run of any
   * status, missed included). A once schedule whose instant already has a row has fired.
   */
  async hasRunForSlot(
    scheduledAgentJobId: string,
    slot: Date,
  ): Promise<boolean> {
    const count = await this.runRepository
      .createQueryBuilder('run')
      .where('run.scheduled_agent_job_id = :scheduledAgentJobId', {
        scheduledAgentJobId,
      })
      .andWhere(`run.trigger = 'schedule'`)
      .andWhere('run.scheduled_for = :slot', { slot })
      .getCount();

    return count > 0;
  }

  /**
   * @description Whether a `schedule`-trigger run of this schedule, other than `excludeRunId`, is
   * queued or running and was opened at or after `createdSince`. The caller passes its own boot time
   * as `createdSince`: a row left in flight by a crash predates the boot and is never live.
   */
  async hasLiveScheduledRun(input: {
    readonly createdSince: Date;
    readonly excludeRunId: string | null;
    readonly scheduledAgentJobId: string;
  }): Promise<boolean> {
    const query = this.runRepository
      .createQueryBuilder('run')
      .where('run.scheduled_agent_job_id = :scheduledAgentJobId', {
        scheduledAgentJobId: input.scheduledAgentJobId,
      })
      .andWhere(`run.trigger = 'schedule'`)
      .andWhere('run.status IN (:...statuses)', {
        statuses: [...SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES],
      })
      .andWhere('run.created_at >= :createdSince', {
        createdSince: input.createdSince,
      });

    if (input.excludeRunId !== null) {
      query.andWhere('run.id <> :excludeRunId', {
        excludeRunId: input.excludeRunId,
      });
    }

    return (await query.getCount()) > 0;
  }

  /** @description Find one run by id, or null. */
  async findRunById(id: string): Promise<ScheduledAgentJobRun | null> {
    return this.runRepository.findOne({ where: { id } });
  }

  /** @description Run history for a schedule, newest first. */
  async listRunsForJob(
    scheduledAgentJobId: string,
    limit = 50,
  ): Promise<ScheduledAgentJobRun[]> {
    return this.runRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      where: { scheduledAgentJobId },
    });
  }

  /**
   * @description Every run that has not reached a terminal status yet — `queued` or `running` — across
   * *all* schedules, oldest-first, so the run that has been going longest reads first. Capped so a
   * stuck queue cannot blow up the response.
   */
  async listInFlightRuns(limit = 50): Promise<ScheduledAgentJobRun[]> {
    return this.runRepository.find({
      order: { createdAt: 'ASC' },
      take: limit,
      where: { status: In([...SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES]) },
    });
  }

  /**
   * @description Live counts of not-yet-terminal runs, grouped by status, across all schedules. Not
   * windowed on purpose: a run queued days ago and still stuck is exactly what a caller asking "what
   * is in flight" needs to see. One grouped aggregate, restricted to the in-flight statuses.
   */
  async countInFlightRunsByStatus(): Promise<
    ScheduledAgentJobRunStatusCount[]
  > {
    const rows = await this.runRepository
      .createQueryBuilder('run')
      .select('run.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('run.status IN (:...statuses)', {
        statuses: [...SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES],
      })
      .groupBy('run.status')
      .getRawMany<{ count: string; status: ScheduledAgentJobRunStatus }>();

    return rows.map((row) => ({
      count: Number(row.count),
      status: row.status,
    }));
  }

  /**
   * @description Run counts grouped by status for runs created at or after `since` — a single grouped
   * aggregate, never a full row fetch. Statuses with no runs in the window are simply absent.
   */
  async countRunsByStatusSince(
    since: Date,
  ): Promise<ScheduledAgentJobRunStatusCount[]> {
    const rows = await this.runRepository
      .createQueryBuilder('run')
      .select('run.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('run.created_at >= :since', { since })
      .groupBy('run.status')
      .getRawMany<{ count: string; status: ScheduledAgentJobRunStatus }>();

    return rows.map((row) => ({
      count: Number(row.count),
      status: row.status,
    }));
  }

  /**
   * @description Mark a run running: stamp startedAt + the BullMQ job id, and (for a pre-created
   * run-now row) backfill the fire-time snapshot the processor resolved — settings, the targeted
   * repository checkout, and the directory the CLI is actually being spawned in. Uses save (not
   * update) so the jsonb `settingsSnapshot` goes through TypeORM's DeepPartial path; only the
   * provided columns are written.
   */
  async markRunStarted(
    id: string,
    bullmqJobId: string,
    snapshot?: StartScheduledAgentJobRunInput,
  ): Promise<void> {
    await this.runRepository.save(
      this.runRepository.create({
        bullmqJobId,
        id,
        startedAt: new Date(),
        status: 'running',
        ...(snapshot?.repositoryCheckoutId === undefined
          ? {}
          : { repositoryCheckoutId: snapshot.repositoryCheckoutId }),
        ...(snapshot?.resolvedCwd === undefined
          ? {}
          : { resolvedCwd: snapshot.resolvedCwd }),
        ...(snapshot?.settingsSnapshot === undefined
          ? {}
          : { settingsSnapshot: snapshot.settingsSnapshot }),
      }),
    );
  }

  /**
   * @description Mark a run terminal: status + finishedAt + optional exit/error and, when parsed
   * from the run's CLI output, the normalized token counts / cost / raw usage. Usage fields left
   * undefined are not written, so the crash/catch callers leave those columns null. Uses save (not
   * update) so the jsonb `rawUsage` goes through TypeORM's DeepPartial path.
   */
  async markRunFinished(
    id: string,
    input: FinishScheduledAgentJobRunInput,
  ): Promise<void> {
    const { usageLimitResetsAt, usageLimitType } = input;

    await this.runRepository.save(
      this.runRepository.create({
        errorMessage: input.errorMessage ?? null,
        exitCode: input.exitCode ?? null,
        finishedAt: new Date(),
        id,
        status: input.status,
        ...(input.cacheReadTokens === undefined
          ? {}
          : { cacheReadTokens: input.cacheReadTokens }),
        ...(input.cacheWriteTokens === undefined
          ? {}
          : { cacheWriteTokens: input.cacheWriteTokens }),
        ...(input.costUsd === undefined ? {} : { costUsd: input.costUsd }),
        ...(input.inputTokens === undefined
          ? {}
          : { inputTokens: input.inputTokens }),
        ...(input.outputTokens === undefined
          ? {}
          : { outputTokens: input.outputTokens }),
        ...(input.rawUsage === undefined ? {} : { rawUsage: input.rawUsage }),
        ...(input.reasoningTokens === undefined
          ? {}
          : { reasoningTokens: input.reasoningTokens }),
        ...(input.totalTokens === undefined
          ? {}
          : { totalTokens: input.totalTokens }),
        ...(usageLimitResetsAt === undefined ? {} : { usageLimitResetsAt }),
        ...(usageLimitType === undefined ? {} : { usageLimitType }),
      }),
    );
  }

  /** @description The continuation of a usage_limited run (`resume_of_run_id` = `runId`), or null. */
  async findRunResumingFrom(
    runId: string,
  ): Promise<ScheduledAgentJobRun | null> {
    return this.runRepository.findOne({ where: { resumeOfRunId: runId } });
  }

  /**
   * @description Counts the usage_limited runs on the continuation chain ENDING at `runId`: the run
   * itself plus every ancestor reached by following `resume_of_run_id`. Backs the "stop auto-resuming
   * after N limited runs" bound. The walk is a recursive CTE capped at `maxDepth` rows, so it is
   * bounded even against a corrupt cyclic chain; the result never exceeds `maxDepth`.
   */
  async countUsageLimitedInChain(
    runId: string,
    maxDepth: number,
  ): Promise<number> {
    const rows: Array<{ readonly count: number | string }> =
      await this.runRepository.query(
        `WITH RECURSIVE chain AS (
           SELECT id, status, resume_of_run_id, 1 AS depth
             FROM scheduled_agent_job_runs
            WHERE id = $1
           UNION ALL
           SELECT parent.id, parent.status, parent.resume_of_run_id, chain.depth + 1
             FROM scheduled_agent_job_runs parent
             JOIN chain ON parent.id = chain.resume_of_run_id
            WHERE chain.depth < $2
         )
         SELECT COUNT(*)::int AS count FROM chain WHERE status = 'usage_limited'`,
        [runId, maxDepth],
      );

    return Number(rows[0]?.count ?? 0);
  }

  /** @description Overwrite a run's error/detail message (e.g. to say why a limited run was not resumed). */
  async updateRunErrorMessage(
    id: string,
    errorMessage: string | null,
  ): Promise<void> {
    await this.runRepository.update({ id }, { errorMessage });
  }

  /** @description Record a durable cancel request on a run. */
  async requestRunCancel(id: string): Promise<void> {
    await this.runRepository.update({ id }, { cancelRequestedAt: new Date() });
  }
}
