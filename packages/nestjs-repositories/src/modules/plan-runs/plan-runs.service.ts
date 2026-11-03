import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type { PlanRunConfigSnapshot } from '@openthrottle/openthrottle-plan-config';
import type { EntityManager, SelectQueryBuilder } from 'typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';

import type {
  PlanRunExecutionBackend,
  PlanRunKind,
} from './plan-run.entity.ts';
import { PlanRun } from './plan-run.entity.ts';
import type { PlanRunStatus } from './plan-runs.constants.ts';
import {
  PLAN_RUN_STARTABLE_STATUSES,
  PLAN_RUN_STATUS,
  STALE_CUTOFF_MS,
  UNSUPERVISED_STALE_CUTOFF_MS,
} from './plan-runs.constants.ts';

/**
 * Excludes a scheduled run that never started: a `scheduled_for` row that is not QUEUED/IN_PROGRESS
 * and was never stamped by `markRunStarted` (`last_heartbeat_at` is NULL). That covers a row still
 * SCHEDULED, one settled MISSED/SUPERSEDED at fire time, one the fire-time policy found nothing to run
 * for, and one cancelled before it fired. A scheduled run that fired is claimed QUEUED and then
 * stamped, so it is never excluded. Used wherever "the plan's newest run" must mean the run that is
 * (or was) actually driving the plan — a scheduled row created after a live run must not stand in
 * for it. Expects the query alias `run`.
 */
const STARTED_OR_STARTABLE_RUN_SQL =
  'NOT (run.scheduled_for IS NOT NULL AND run.last_heartbeat_at IS NULL AND run.status NOT IN (:...startableStatuses))';

interface RecordQueuedPlanRunInput {
  /** User who enqueued the run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  /** Git branch the run operates on, captured at kickoff. Null until the required-input path supplies it. */
  readonly branch?: string | null;
  readonly bullmqJobId: string;
  /** Worktree/checkout the run runs in (repository_checkouts.id); the durable on-disk home for deep-links. */
  readonly checkoutId?: string | null;
  readonly executionBackend: WorkflowConfigRunner;
  /** Resolved agent model id (queryable projection of run_config_snapshot.ralph.model). */
  readonly model?: string | null;
  readonly planId: string;
  readonly queueName: string;
  /** The usage-limited run this run continues (migration 138); omit/null for an ordinary run. */
  readonly resumeOfRunId?: string | null;
  readonly runConfigSnapshot?: PlanRunConfigSnapshot | null;
  readonly runKind: PlanRunKind;
  /** The UTC instant a SCHEDULED run fires at (migration 140); omit/null for a run enqueued to run now. */
  readonly scheduledFor?: Date | null;
  /** Initial status; defaults to QUEUED. SCHEDULED for a run created by schedulePlanRun. */
  readonly status?: PlanRunStatus;
}

/** The usage limit that stopped a run, as persisted on its row by {@link PlanRunsService.settleRunUsageLimited}. */
interface UsageLimitSettleInput {
  /** Reset instant; null when the agent CLI did not report one. */
  readonly resetsAt: Date | null;
  /** Raw window name (`five_hour`, `seven_day`, …); null when not reported. */
  readonly type: string | null;
}

/**
 * Input for a detached workflow-ralph CLI run row. The CLI carries no BullMQ job
 * and drives its own iteration loop, so the row is inserted with a null
 * bullmqJobId and runKind 'orchestrator'.
 */
interface RegisterCliPlanRunInput {
  /** User who started the CLI run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  /**
   * OPTIONAL git branch the CLI run operates on. Omit/null → store null; non-empty
   * strings are stored verbatim (no trim/reject — enqueue remains the REQUIRED boundary).
   */
  readonly branch?: string | null;
  readonly executionBackend: PlanRunExecutionBackend;
  /**
   * Whether this run's owner bumps its heartbeat on a timer. Defaults to true so
   * the detached workflow-ralph CLI (which does, on a ~15s timer) is untouched;
   * an owner with no timer — an interactive /ot-loop agent turn — passes false to
   * opt out of every heartbeat-based liveness judgement (migration 110).
   */
  readonly heartbeatExpected?: boolean;
  readonly hostname: string | null;
  /** Resolved agent model id for this run; null when the caller cannot determine one. */
  readonly model?: string | null;
  readonly pid: number | null;
  readonly planId: string;
  readonly workerId: string | null;
}

/** A plan's soonest SCHEDULED run: which row it is and the instant it fires. */
export interface ScheduledPlanRun {
  readonly id: string;
  readonly scheduledFor: Date;
}

/** Where a run is executing; stamped at job start, cleared at finish. */
interface RunLocation {
  readonly bullmqJobId: string;
  readonly hostname: string | null;
  readonly pid: number | null;
  readonly queueName: string;
  readonly workerId: string | null;
}

/** The durable cancel-request marker for a plan's live run. */
interface CancelMarker {
  readonly cancelRequestedAt: Date;
  readonly cancelRequestedBy: string | null;
}

@Injectable()
export class PlanRunsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(PlanRun)
    private readonly planRunRepository: Repository<PlanRun>,
  ) {
    this.logger.debug('🧩 plan-runs 🧩');
  }

  /**
   * @description Returns the TypeORM repository for plan_runs. Use for run audit queries.
   */
  getRepository(): Repository<PlanRun> {
    return this.planRunRepository;
  }

  /**
   * @description Records a queued Ralph run (status QUEUED, or SCHEDULED with `scheduledFor` for a
   * delayed scheduled run), idempotent per (queueName, bullmqJobId) so repeated enqueue calls
   * round-trip the same audit row (refreshing the mutable enqueue fields).
   *
   * Uses find-then-save rather than `repo.upsert()`: the (queueName, bullmqJobId) uniqueness is a
   * PARTIAL unique index (`... WHERE bullmq_job_id IS NOT NULL`, migration 076) which TypeORM's
   * `ON CONFLICT (queue_name, bullmq_job_id)` cannot target. The partial index still guards against
   * concurrent duplicate inserts at the DB level. Pass `manager` to enlist in a caller-owned tx.
   */
  async recordQueuedRun(
    input: RecordQueuedPlanRunInput,
    manager?: EntityManager,
  ): Promise<PlanRun> {
    const repo = manager
      ? manager.getRepository(PlanRun)
      : this.getRepository();
    // The snapshot is written to an opaque jsonb column; type it as `object | null`
    // so TypeORM's QueryDeepPartialEntity does not deep-recurse into the snapshot's
    // `readonly unknown[]` members (which it cannot express), keeping the write cast-free.
    const runConfigSnapshot: object | null = input.runConfigSnapshot ?? null;
    const rowInput = {
      actorUserId: input.actorUserId ?? null,
      branch: input.branch ?? null,
      bullmqJobId: input.bullmqJobId,
      checkoutId: input.checkoutId ?? null,
      executionBackend: input.executionBackend,
      model: input.model ?? null,
      planId: input.planId,
      queueName: input.queueName,
      resumeOfRunId: input.resumeOfRunId ?? null,
      runConfigSnapshot,
      runKind: input.runKind,
      scheduledFor: input.scheduledFor ?? null,
      status: input.status ?? PLAN_RUN_STATUS.QUEUED,
    };

    const existing = await repo.findOne({
      where: {
        bullmqJobId: input.bullmqJobId,
        queueName: input.queueName,
      },
    });

    if (existing) {
      await repo.update({ id: existing.id }, rowInput);

      return (await repo.findOne({ where: { id: existing.id } })) ?? existing;
    }

    return repo.save(repo.create(rowInput));
  }

  /**
   * @description Registers a detached workflow-ralph CLI run as a first-class plan_runs row so
   * {@link PlanRunsService.stampCancelRequested} (via PlanStatusService.cancelRun) has a row to
   * stamp the durable cancel marker on. Inserts with bullmqJobId NULL (permitted by the partial
   * unique index from migration 076 — see the entity note), runKind 'orchestrator' (the CLI drives
   * its own iteration loop, NOT the dead spawn worker), status 'IN_PROGRESS', and the run-location
   * columns (hostname/pid/workerId) stamped at creation. Creates NO BullMQ job — this is an
   * in-process laptop run, not a queued job. Returns the created run.
   */
  async registerCliRun(input: RegisterCliPlanRunInput): Promise<PlanRun> {
    const repo = this.getRepository();

    // Settle-on-next-register: an unsupervised run has no timer, so nothing settles it
    // promptly when its agent simply goes away. Registering a NEW unsupervised run for the
    // same plan is direct evidence the previous one is over — you do not start a second
    // interactive loop on a plan you are still driving. Settling here (before the insert, so
    // the new row is never a candidate) makes the common case — abandon a loop, re-run it —
    // clean up instantly, leaving the age sweep as the floor rather than the only path.
    if (input.heartbeatExpected === false) {
      await this.settleSupersededUnsupervisedRuns(input.planId);
    }

    return repo.save(
      repo.create({
        actorUserId: input.actorUserId ?? null,
        branch: input.branch ?? null,
        bullmqJobId: null,
        executionBackend: input.executionBackend,
        heartbeatExpected: input.heartbeatExpected ?? true,
        hostname: input.hostname,
        // Stamp the initial heartbeat at creation so the run is immediately alive
        // (avoids a false-stale window before the CLI's first heartbeat tick).
        lastHeartbeatAt: new Date(),
        model: input.model ?? null,
        pid: input.pid,
        planId: input.planId,
        queueName: 'plans',
        runKind: 'orchestrator',
        status: 'IN_PROGRESS',
        workerId: input.workerId,
      }),
    );
  }

  /**
   * @description Settles a detached-CLI run on exit, keyed on the RUN ID (not the
   * (queueName, bullmqJobId) pair, which {@link clearRunLocation} uses and which cannot address a
   * null-job-id CLI row). Sets the terminal status (COMPLETED / CANCELLED / FAILED) and nulls the
   * run-location columns; leaves the cancel marker intact (audit record). Returns the updated run,
   * or null when no row matched the id.
   */
  async settleCliRun(
    planRunId: string,
    status: string,
  ): Promise<PlanRun | null> {
    const repo = this.getRepository();

    await repo.update(
      { id: planRunId },
      { hostname: null, pid: null, status, workerId: null },
    );

    return repo.findOne({ where: { id: planRunId } });
  }

  /**
   * @description Finds the plan run for a (queueName, bullmqJobId) pair — the unique key a worker
   * knows at run time — so it can resolve plan_run_id + actor_user_id (for the work-ledger session).
   */
  async findByQueueNameAndBullmqJobId(
    queueName: string,
    bullmqJobId: string,
  ): Promise<PlanRun | null> {
    return this.getRepository().findOne({
      where: { bullmqJobId, queueName },
    });
  }

  /**
   * @description Returns a single run by its id, or null when none matches.
   */
  async findById(planRunId: string): Promise<PlanRun | null> {
    return this.getRepository().findOne({ where: { id: planRunId } });
  }

  /**
   * @description Back-fills `checkout_id` only when still NULL (never overwrites
   * an existing id). Race-safe via the WHERE clause. Returns the updated run,
   * or null when the row no longer exists.
   */
  async setCheckoutIdIfNull(
    planRunId: string,
    checkoutId: string,
  ): Promise<PlanRun | null> {
    await this.getRepository().update(
      { checkoutId: IsNull(), id: planRunId },
      { checkoutId },
    );

    return this.findById(planRunId);
  }

  /**
   * @description Rewrites `run_config_snapshot.workspace` for a run whose working directory was
   * resolved after enqueue — a plan run whose worktree OpenThrottle creates at job start only learns
   * the path then, and the snapshot has to show the directory the agent actually used. Leaves the
   * rest of the snapshot untouched; no-ops when the run or its snapshot is missing.
   */
  async setRunConfigSnapshotWorkspace(
    planRunId: string,
    workspace: {
      readonly checkoutId?: string | null;
      readonly workingDirectory: string;
    },
  ): Promise<PlanRun | null> {
    const run = await this.findById(planRunId);
    if (run === null || run.runConfigSnapshot == null) {
      return run;
    }

    const current = run.runConfigSnapshot;
    const checkoutId = workspace.checkoutId ?? current.workspace.checkoutId;

    const next: PlanRunConfigSnapshot = {
      ...current,
      workspace: {
        ...current.workspace,
        ...(checkoutId != null && checkoutId !== '' ? { checkoutId } : {}),
        workingDirectory: workspace.workingDirectory,
      },
    };

    // Same reason as `recordQueuedRun`: type the jsonb payload as `object` so TypeORM's
    // QueryDeepPartialEntity does not deep-recurse into the snapshot's readonly members.
    const runConfigSnapshot: object = next;

    await this.getRepository().update({ id: planRunId }, { runConfigSnapshot });

    return this.findById(planRunId);
  }

  /**
   * @description Returns recent plan runs newest first for GraphQL/UI audit views.
   */
  async findRecentByPlanId(planId: string, limit: number): Promise<PlanRun[]> {
    return this.getRepository().find({
      order: { createdAt: 'DESC' },
      take: limit,
      where: { planId },
    });
  }

  /**
   * @description Stamps run-location columns when a worker picks up the job (alongside
   * PlanRunCancellationService.attach), in the SAME update as the IN_PROGRESS status write — a row
   * that is located-but-still-QUEUED, even briefly, is the bug this claim exists to close (a crash
   * in that window would recreate it permanently).
   *
   * Guarded on {@link PLAN_RUN_STARTABLE_STATUSES} (QUEUED on first pickup, IN_PROGRESS on a BullMQ
   * retry or stalled-job recovery) in the same conditional UPDATE, so it can never reopen a settled
   * row (CANCELLED, MISSED, SUPERSEDED, STALE, COMPLETED, ...) nor skip the fire-time policy by flipping
   * a SCHEDULED row straight to IN_PROGRESS. Returns the number of rows updated: 0 both for a run that
   * was never recorded (e.g. legacy) and for one the guard rejected — the caller tells them apart by
   * whether it found a row first.
   */
  async markRunStarted(location: RunLocation): Promise<number> {
    const result = await this.getRepository()
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: location.hostname,
        // Stamp the initial heartbeat when the worker picks up the job, so the run
        // is immediately alive before the processor's first heartbeat tick.
        lastHeartbeatAt: new Date(),
        pid: location.pid,
        status: PLAN_RUN_STATUS.IN_PROGRESS,
        workerId: location.workerId,
      })
      .where('bullmq_job_id = :bullmqJobId', {
        bullmqJobId: location.bullmqJobId,
      })
      .andWhere('queue_name = :queueName', { queueName: location.queueName })
      .andWhere('status IN (:...startableStatuses)', {
        startableStatuses: [...PLAN_RUN_STARTABLE_STATUSES],
      })
      .execute();

    return result.affected ?? 0;
  }

  /**
   * @description Settles a queued/worker-owned run on exit, keyed on the (queueName,
   * bullmqJobId) pair — the unique key a BullMQ worker knows at run time, symmetric with
   * {@link PlanRunsService.markRunStarted} and {@link PlanRunsService.clearRunLocation}. Unlike
   * {@link PlanRunsService.settleCliRun} (keyed on the run id — the CLI shape, which the worker
   * never has a handle on), this addresses the queued-run row by its job key. Sets the terminal
   * status (COMPLETED / CANCELLED / FAILED — never STALE, which is reserved for the stale sweeper)
   * and nulls the run-location columns in one update; leaves the cancel marker and
   * lastHeartbeatAt untouched. Best-effort by key: returns null when no row matched.
   */
  async settleRunByJob(
    queueName: string,
    bullmqJobId: string,
    status: PlanRunStatus,
  ): Promise<PlanRun | null> {
    const repo = this.getRepository();

    await repo.update(
      { bullmqJobId, queueName },
      { hostname: null, pid: null, status, workerId: null },
    );

    return repo.findOne({ where: { bullmqJobId, queueName } });
  }

  /**
   * @description Settles a worker-owned run to {@link PLAN_RUN_STATUS.USAGE_LIMITED}, keyed on the
   * (queueName, bullmqJobId) pair like {@link PlanRunsService.settleRunByJob}, and records the limit
   * that stopped it (`usage_limit_resets_at` / `usage_limit_type`). Guarded: only a row still
   * QUEUED or IN_PROGRESS is written, so a run the stale sweeper (STALE) or a cancel (CANCELLED)
   * already settled is never overwritten. Nulls the run-location columns in the same update. Returns
   * the settled row, or null when no row matched or the guard rejected the write.
   */
  async settleRunUsageLimited(
    queueName: string,
    bullmqJobId: string,
    limit: UsageLimitSettleInput,
  ): Promise<PlanRun | null> {
    const repo = this.getRepository();
    const result = await repo
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.USAGE_LIMITED,
        usageLimitResetsAt: limit.resetsAt,
        usageLimitType: limit.type,
        workerId: null,
      })
      .where('bullmq_job_id = :bullmqJobId', { bullmqJobId })
      .andWhere('queue_name = :queueName', { queueName })
      .andWhere('status IN (:...statuses)', {
        statuses: [PLAN_RUN_STATUS.IN_PROGRESS, PLAN_RUN_STATUS.QUEUED],
      })
      .execute();

    if ((result.affected ?? 0) === 0) {
      return null;
    }

    return repo.findOne({ where: { bullmqJobId, queueName } });
  }

  /**
   * @description Returns the plan's SCHEDULED runs (delayed job waiting, not yet fired). Lets cancel
   * tell the jobs it removes for a scheduled run apart from jobs of an ordinary queued run.
   */
  async findScheduledByPlanId(planId: string): Promise<PlanRun[]> {
    return this.getRepository().find({
      where: { planId, status: PLAN_RUN_STATUS.SCHEDULED },
    });
  }

  /**
   * @description Settles ONE SCHEDULED run to CANCELLED — the row half of a run-scoped cancel (the
   * caller removes that run's delayed job). Guarded on `id` and `status = SCHEDULED`, so a run that
   * already fired or settled is never touched and a repeat call is a no-op. Leaves every other run
   * of the plan alone, and `scheduled_for` is kept. Returns whether a row was settled.
   */
  async settleScheduledRunCancelled(planRunId: string): Promise<boolean> {
    const result = await this.getRepository()
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.CANCELLED,
        workerId: null,
      })
      .where('id = :planRunId', { planRunId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.SCHEDULED })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Settles the plan's SCHEDULED runs to CANCELLED — the plan_runs half of cancelling a
   * scheduled run (the caller removes the delayed BullMQ job). Guarded on `status = SCHEDULED`, so a
   * run that already fired (IN_PROGRESS) or settled is never touched and a repeat call is a no-op,
   * which makes cancel idempotent. `exceptBullmqJobIds` lists jobs a worker holds locked (they are
   * firing right now); their rows are left for the worker to flip. `scheduled_for` is kept so run
   * history still shows when the run was meant to fire. Returns the number of rows settled.
   */
  async settleScheduledRunsCancelled(
    planId: string,
    exceptBullmqJobIds: readonly string[] = [],
  ): Promise<number> {
    const query = this.getRepository()
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.CANCELLED,
        workerId: null,
      })
      .where('plan_id = :planId', { planId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.SCHEDULED });

    if (exceptBullmqJobIds.length > 0) {
      query.andWhere(
        '(bullmq_job_id IS NULL OR bullmq_job_id NOT IN (:...exceptBullmqJobIds))',
        {
          exceptBullmqJobIds: [...exceptBullmqJobIds],
        },
      );
    }

    const result = await query.execute();

    return result.affected ?? 0;
  }

  /**
   * @description Moves ONE SCHEDULED run to `toStatus` — the single race point of the fire-time
   * policy: QUEUED when the run fires (claimed for the worker), MISSED / SUPERSEDED / COMPLETED when
   * the policy settles it instead. An atomic conditional UPDATE guarded on `id` AND
   * `status = SCHEDULED`, so of a concurrent cancel ({@link settleScheduledRunCancelled} /
   * {@link settleScheduledRunsCancelled}, guarded the same way) and a fire, exactly one wins and the
   * loser's update matches no row. Nulls the run-location columns; keeps `scheduled_for`. Pass
   * `manager` to enlist in a caller-owned transaction. Returns whether this call won.
   */
  async transitionScheduledRun(
    planRunId: string,
    toStatus: PlanRunStatus,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(PlanRun)
      : this.getRepository();
    const result = await repo
      .createQueryBuilder()
      .update(PlanRun)
      .set({ hostname: null, pid: null, status: toStatus, workerId: null })
      .where('id = :planRunId', { planRunId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.SCHEDULED })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Whether the plan has an active run other than `exceptPlanRunId`: a plan_runs row in
   * QUEUED or IN_PROGRESS. That is every run that holds, or is about to take, the plan's tasks — an
   * ordinary queued run, a usage-limit continuation waiting out its reset, a worker run, a detached CLI
   * run and an interactive /ot-loop run alike. Deliberately no liveness cutoff: whether a silent run is
   * dead is the stale sweepers' call, and a run they have not settled yet may still be writing tasks.
   * Backs the fire-time collision hold. Pass `manager` to read inside a caller-owned transaction.
   */
  async hasActiveRun(
    planId: string,
    exceptPlanRunId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(PlanRun)
      : this.getRepository();
    const count = await repo.count({
      where: {
        id: Not(exceptPlanRunId),
        planId,
        status: In([PLAN_RUN_STATUS.IN_PROGRESS, PLAN_RUN_STATUS.QUEUED]),
      },
    });

    return count > 0;
  }

  /**
   * @description The SCHEDULED runs the boot reconcile checks against BullMQ: status SCHEDULED with a
   * `bullmq_job_id` and a `scheduled_for` (every row `schedulePlanRun` writes has both). Rows with no
   * job id by design — detached CLI and interactive runs — can never qualify. Soonest first, capped at
   * `limit`; served by the partial index from migration 140.
   */
  async findScheduledRunsWithJob(limit: number): Promise<PlanRun[]> {
    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', { status: PLAN_RUN_STATUS.SCHEDULED })
      .andWhere('run.bullmq_job_id IS NOT NULL')
      .andWhere('run.scheduled_for IS NOT NULL')
      .orderBy('run.scheduled_for', 'ASC')
      .take(limit)
      .getMany();
  }

  /**
   * @description The soonest SCHEDULED run of each given plan (its id and `scheduled_for`), keyed by
   * plan id; a plan with no SCHEDULED run is absent from the map. Backs the plan's `scheduledRunAt`
   * and `scheduledRunId` fields in ONE query: `scheduledRunAt` lets the UI say "a run is scheduled
   * for ...", `scheduledRunId` lets it cancel exactly that run. Only SCHEDULED rows count: one that
   * fired, was cancelled or was settled MISSED/SUPERSEDED is no longer waiting. Two SCHEDULED rows
   * can share an instant, so the pick is deterministic: `scheduled_for`, then `id`. Returns an empty
   * map for an empty id list rather than issuing an unbounded query.
   */
  async findEarliestScheduledForByPlanIds(
    planIds: readonly string[],
  ): Promise<Map<string, ScheduledPlanRun>> {
    if (planIds.length === 0) return new Map();

    const rows = await this.getRepository()
      .createQueryBuilder('run')
      .distinctOn(['run.plan_id'])
      .select('run.plan_id', 'plan_id')
      .addSelect('run.id', 'id')
      .addSelect('run.scheduled_for', 'scheduled_for')
      .where('run.status = :status', { status: PLAN_RUN_STATUS.SCHEDULED })
      .andWhere('run.scheduled_for IS NOT NULL')
      .andWhere('run.plan_id IN (:...planIds)', { planIds: [...planIds] })
      .orderBy('run.plan_id', 'ASC')
      .addOrderBy('run.scheduled_for', 'ASC')
      .addOrderBy('run.id', 'ASC')
      .getRawMany<{
        id: string;
        plan_id: string;
        scheduled_for: Date | string;
      }>();

    return new Map(
      rows.map((row) => [
        row.plan_id,
        { id: row.id, scheduledFor: new Date(row.scheduled_for) },
      ]),
    );
  }

  /**
   * @description Counts the USAGE_LIMITED runs on the continuation chain ENDING at `runId`: the run
   * itself plus every ancestor reached by following `resume_of_run_id`. Backs the policy's
   * "stop auto-resuming after N limited runs" bound. The walk is a recursive CTE capped at
   * `maxDepth` rows, so it is bounded even against a corrupt cyclic chain; the result therefore
   * never exceeds `maxDepth`.
   */
  async countUsageLimitedInChain(
    runId: string,
    maxDepth: number,
  ): Promise<number> {
    const rows: Array<{ readonly count: number | string }> =
      await this.getRepository().query(
        `WITH RECURSIVE chain AS (
           SELECT id, status, resume_of_run_id, 1 AS depth
             FROM plan_runs
            WHERE id = $1
           UNION ALL
           SELECT parent.id, parent.status, parent.resume_of_run_id, chain.depth + 1
             FROM plan_runs parent
             JOIN chain ON parent.id = chain.resume_of_run_id
            WHERE chain.depth < $2
         )
         SELECT COUNT(*)::int AS count FROM chain WHERE status = $3`,
        [runId, maxDepth, PLAN_RUN_STATUS.USAGE_LIMITED],
      );

    return Number(rows[0]?.count ?? 0);
  }

  /**
   * @description Clears run-location columns in the worker finally (alongside detach). Leaves the
   * cancel marker intact (it is an audit record). Returns the number of rows updated.
   */
  async clearRunLocation(
    queueName: string,
    bullmqJobId: string,
  ): Promise<number> {
    const result = await this.getRepository().update(
      { bullmqJobId, queueName },
      { hostname: null, pid: null, workerId: null },
    );

    return result.affected ?? 0;
  }

  /**
   * @description The plan's newest run that started or is about to — skipping scheduled runs that
   * never started ({@link STARTED_OR_STARTABLE_RUN_SQL}). The row the cancel marker belongs on.
   */
  private async findNewestStartedOrStartableRun(
    planId: string,
  ): Promise<PlanRun | null> {
    return this.whereStartedOrStartable(
      this.getRepository()
        .createQueryBuilder('run')
        .where('run.plan_id = :planId', { planId }),
    )
      .orderBy('run.created_at', 'DESC')
      .getOne();
  }

  /** @description Adds {@link STARTED_OR_STARTABLE_RUN_SQL} to a `run`-aliased query. */
  private whereStartedOrStartable(
    query: SelectQueryBuilder<PlanRun>,
  ): SelectQueryBuilder<PlanRun> {
    return query.andWhere(STARTED_OR_STARTABLE_RUN_SQL, {
      startableStatuses: [...PLAN_RUN_STARTABLE_STATUSES],
    });
  }

  /**
   * @description Stamps the durable cancel-request marker (cancel_requested_at/by) on the plan's
   * NEWEST run row — which is the currently-active run (each enqueue/CLI start inserts a fresh row).
   * Keying on the newest row (rather than "any located run") keeps {@link readCancelRequested}
   * symmetric and prevents a stale marker on an older, finished run from bleeding onto a later run.
   * This is the cross-process/host/CLI stop guarantee: the run loop polls the marker at each
   * iteration boundary. Returns the run id that was marked, or null when the plan has no run row.
   *
   * Scheduled runs that never started are skipped ({@link STARTED_OR_STARTABLE_RUN_SQL}): a run
   * scheduled while another is live is a NEWER row, and stamping it would leave the live run — the one
   * the Kill is aimed at — without the marker it polls for.
   */
  async stampCancelRequested(
    planId: string,
    requestedByUserId: string | null,
  ): Promise<string | null> {
    const target = await this.findNewestStartedOrStartableRun(planId);

    if (!target) {
      return null;
    }

    await this.getRepository().update(
      { id: target.id },
      { cancelRequestedAt: new Date(), cancelRequestedBy: requestedByUserId },
    );

    return target.id;
  }

  /**
   * @description Reads the durable cancel-request marker for a plan's active run (the run loop's
   * iteration-boundary fallback when the pub/sub fast-path message was missed). Scoped to the NEWEST
   * run row so a fresh run never inherits a prior run's marker; returns its marker when set, else
   * null. Skips never-started scheduled runs exactly like {@link stampCancelRequested}, so the two
   * always agree on which row is the live run.
   */
  async readCancelRequested(planId: string): Promise<CancelMarker | null> {
    const run = await this.findNewestStartedOrStartableRun(planId);

    if (!run?.cancelRequestedAt) {
      return null;
    }

    return {
      cancelRequestedAt: run.cancelRequestedAt,
      cancelRequestedBy: run.cancelRequestedBy,
    };
  }

  /**
   * @description Bumps the liveness heartbeat on a run keyed by RUN ID — the CLI path,
   * whose row has a null bullmqJobId that {@link recordHeartbeatByJob} cannot address.
   * Best-effort telemetry: returns the number of rows updated (0 for an unknown id).
   */
  async recordHeartbeatById(planRunId: string): Promise<number> {
    const result = await this.getRepository().update(
      { id: planRunId },
      { lastHeartbeatAt: new Date() },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Bumps the liveness heartbeat on a run keyed by (queueName, bullmqJobId)
   * — the in-server worker path, symmetric with {@link markRunStarted}. Best-effort
   * telemetry: returns the number of rows updated (0 for an unrecorded/legacy run).
   */
  async recordHeartbeatByJob(
    queueName: string,
    bullmqJobId: string,
  ): Promise<number> {
    const result = await this.getRepository().update(
      { bullmqJobId, queueName },
      { lastHeartbeatAt: new Date() },
    );

    return result.affected ?? 0;
  }

  /**
   * @description Settles every OTHER unsupervised (`heartbeat_expected = false`) IN_PROGRESS run
   * on a plan to STALE — the fast path of the unsupervised janitor, called from
   * {@link PlanRunsService.registerCliRun} just before a new unsupervised row is inserted.
   *
   * Two concurrent interactive loops on one plan is not a supported state, and an older row is
   * already functionally dead: {@link PlanRunsService.stampCancelRequested} and
   * {@link PlanRunsService.readCancelRequested} both key on the plan's NEWEST run, so once a newer
   * row exists the older one can no longer even receive a cancel. Leaving it IN_PROGRESS only makes
   * it read as live and hold its worktree busy forever.
   *
   * Deliberately does NOT touch plan or task status — same invariant as the age sweep. Scoped to
   * `heartbeat_expected = false` so a queued or detached-CLI run, which has a timer and a sweeper of
   * its own, is never collateral. Returns the number of rows settled.
   */
  async settleSupersededUnsupervisedRuns(planId: string): Promise<number> {
    const result = await this.getRepository()
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.STALE,
        workerId: null,
      })
      .where('plan_id = :planId', { planId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('NOT heartbeat_expected')
      .execute();

    return result.affected ?? 0;
  }

  /**
   * @description Finds UNSUPERVISED (`heartbeat_expected = false`) IN_PROGRESS runs older than
   * `cutoff` — the exact complement of {@link PlanRunsService.findStaleInProgressRuns}, which
   * excludes them. Together the two cover every IN_PROGRESS row, so no run is left with no janitor.
   *
   * The predicate is age, not silence. These rows have no timer, so `last_heartbeat_at` is stamped
   * once at creation and never bumped; COALESCE with `created_at` therefore reads as "when this run
   * started" rather than "when it was last alive". That is the honest signal to use, and it is why
   * the caller must pass {@link UNSUPERVISED_STALE_CUTOFF_MS} rather than the 120s
   * {@link STALE_CUTOFF_MS}. Oldest-first, capped at `limit`.
   *
   * SCHEDULED carve-out: as in {@link PlanRunsService.findStaleInProgressRuns}, a SCHEDULED run is
   * never swept. The `status = IN_PROGRESS` equality is what keeps a row scheduled days ahead (an old
   * `created_at`, no heartbeat yet) from reading as an abandoned loop.
   */
  async findStaleUnsupervisedRuns(
    cutoff: Date,
    limit: number,
  ): Promise<PlanRun[]> {
    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('NOT run.heartbeat_expected')
      .andWhere('COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff', {
        cutoff,
      })
      .orderBy('run.created_at', 'ASC')
      .take(limit)
      .getMany();
  }

  /**
   * @description Finds IN_PROGRESS runs whose liveness is older than `cutoff` — i.e.
   * stranded by a hard crash (SIGKILL/power-loss) that skipped the graceful settle path.
   * Uses COALESCE(last_heartbeat_at, created_at) so rows that never heartbeated (legacy,
   * or crashed before their first tick) are also caught once old enough. Newest-relevant
   * ordering is irrelevant to a sweep, so returns oldest-first, capped at `limit`.
   *
   * Runs with `heartbeat_expected = false` are excluded outright (migration 110): their
   * owner has no timer, so a quiet gap is normal rather than fatal, and sweeping one is
   * not a tidy-up — the sweeper's reconcileStrandedPlan resets the plan and every
   * IN_PROGRESS task to PENDING, destroying live work.
   *
   * SCHEDULED carve-out: a SCHEDULED run (a `schedulePlanRun` row waiting on its delayed job, up to 30
   * days out) is NOT a candidate, and must stay that way. Its `created_at` is the moment it was
   * scheduled, so against a 120s cutoff it reads as maximally stale, yet it has not started: it holds
   * no process, no worktree and no task. Sweeping it would settle the row STALE and reconcile the plan
   * and tasks to PENDING. The `status = IN_PROGRESS` equality below is the carve-out; widening it to an
   * unsettled set (`IN (QUEUED, IN_PROGRESS, ...)`) must exclude SCHEDULED explicitly.
   */
  async findStaleInProgressRuns(
    cutoff: Date,
    limit: number,
  ): Promise<PlanRun[]> {
    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', {
        status: PLAN_RUN_STATUS.IN_PROGRESS,
      })
      .andWhere('run.heartbeat_expected')
      .andWhere('COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff', {
        cutoff,
      })
      .orderBy('run.created_at', 'ASC')
      .take(limit)
      .getMany();
  }

  /**
   * @description Finds LIVE IN_PROGRESS runs executing in one of the given checkouts — the
   * mirror image of {@link findStaleInProgressRuns}: same COALESCE(last_heartbeat_at, created_at)
   * liveness expression, but on the fresh side of `cutoff`. A stale IN_PROGRESS row is dead, so it
   * must never be reported as running. Newest first so the most recent run wins per checkout.
   * Returns [] for an empty id list rather than issuing an unbounded query.
   *
   * The cutoff test applies only to runs that heartbeat. For a `heartbeat_expected = false`
   * run (migration 110) there is no timer to read, so IN_PROGRESS *is* the liveness signal —
   * without this a healthy interactive loop's worktree would report idle two minutes in.
   *
   * SCHEDULED carve-out: a SCHEDULED run does NOT make its worktree busy. It records a `checkout_id`
   * at schedule time, but it holds nothing until it fires and is claimed QUEUED -> IN_PROGRESS. The
   * `status = IN_PROGRESS` equality is the carve-out; do not widen it without excluding SCHEDULED.
   * @public
   */
  async findLiveRunsByCheckoutIds(
    checkoutIds: readonly string[],
    cutoff: Date,
  ): Promise<PlanRun[]> {
    if (checkoutIds.length === 0) return [];

    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('run.checkout_id IN (:...checkoutIds)', {
        checkoutIds: [...checkoutIds],
      })
      .andWhere(
        '(NOT run.heartbeat_expected OR COALESCE(run.last_heartbeat_at, run.created_at) >= :cutoff)',
        { cutoff },
      )
      .orderBy('run.created_at', 'DESC')
      .getMany();
  }

  /**
   * @description Of the given plans, returns the ids whose NEWEST run is a live detached run: no
   * BullMQ job, still IN_PROGRESS, and not stale. These are the interactive /ot-loop rows
   * (`heartbeat_expected = false`) and the detached workflow-ralph CLI rows — both drive their own
   * loop outside the server, so a server restart neither interrupts them nor leaves a job behind to
   * find. Their owner settles them (or the sweeps do); a caller looking for "IN_PROGRESS with no
   * active job" must leave these plans alone.
   *
   * "Not stale" uses the same two cutoffs as the sweepers, so a row is never live here and dead
   * there: {@link STALE_CUTOFF_MS} since the last heartbeat for a run that heartbeats, and
   * {@link UNSUPERVISED_STALE_CUTOFF_MS} of sheer age for one that does not
   * (see {@link PlanRunsService.findStaleUnsupervisedRuns}). Only the newest run per plan counts — an
   * older row is superseded, so it says nothing about what is driving the plan now. "Newest" skips
   * scheduled runs that never started ({@link STARTED_OR_STARTABLE_RUN_SQL}): a run scheduled while an
   * interactive loop is live is a newer row that drives nothing, and letting it stand in for the loop
   * would hand the live plan straight back to the startup reconcile. Returns an empty set for an
   * empty id list rather than issuing an unbounded query. A SCHEDULED row is never itself "live"
   * (only IN_PROGRESS qualifies).
   * @public
   */
  async findPlanIdsWithLiveDetachedRun(
    planIds: readonly string[],
    now: Date = new Date(),
  ): Promise<Set<string>> {
    if (planIds.length === 0) return new Set();

    const latestRuns = await this.whereStartedOrStartable(
      this.getRepository()
        .createQueryBuilder('run')
        .distinctOn(['run.plan_id'])
        .where('run.plan_id IN (:...planIds)', { planIds: [...planIds] }),
    )
      .orderBy('run.plan_id', 'ASC')
      .addOrderBy('run.created_at', 'DESC')
      .getMany();

    const live = latestRuns.filter((run) => {
      if (run.bullmqJobId !== null) return false;
      if (run.status !== PLAN_RUN_STATUS.IN_PROGRESS) return false;

      const lastSeenAt = run.lastHeartbeatAt ?? run.createdAt;
      const cutoffMs = run.heartbeatExpected
        ? STALE_CUTOFF_MS
        : UNSUPERVISED_STALE_CUTOFF_MS;

      return now.getTime() - lastSeenAt.getTime() < cutoffMs;
    });

    return new Set(live.map((run) => run.planId));
  }

  /**
   * @description Finds every UNSETTLED run (QUEUED or IN_PROGRESS) pointed at one of the given
   * checkouts, with no liveness filter. Deliberately stricter than
   * {@link findLiveRunsByCheckoutIds}: this guards deleting a checkout row, and a run nobody has
   * settled yet may still come back to the worktree it names — a stale-looking row is only
   * provably dead once the sweeper or its owner settles it. Returns [] for an empty id list.
   *
   * SCHEDULED carve-out: the status list is deliberately an allowlist of QUEUED and IN_PROGRESS.
   * A SCHEDULED run has not started and holds no worktree, so it does not make a checkout "busy" for
   * pruning. Keep SCHEDULED out of it unless the product decision changes (see the regression test).
   * @public
   */
  async findUnsettledRunsByCheckoutIds(
    checkoutIds: readonly string[],
  ): Promise<PlanRun[]> {
    if (checkoutIds.length === 0) return [];

    return this.getRepository()
      .createQueryBuilder('run')
      .where('run.status IN (:...statuses)', {
        statuses: [PLAN_RUN_STATUS.QUEUED, PLAN_RUN_STATUS.IN_PROGRESS],
      })
      .andWhere('run.checkout_id IN (:...checkoutIds)', {
        checkoutIds: [...checkoutIds],
      })
      .getMany();
  }

  /**
   * @description Force-settles ONE unsupervised run to STALE — the human escape hatch behind the
   * UI's "settle this run" affordance, and the answer for every case the age sweep and
   * settle-on-next-register do not catch soon enough.
   *
   * This exists because Kill does not help here. Cancelling an interactive run only stamps the
   * durable cancel marker and waits for the agent to poll it; if that agent is gone, nothing ever
   * reads the marker and the row stays IN_PROGRESS — reading as live and holding its worktree busy
   * — forever. Force-settling writes the terminal status directly.
   *
   * Guarded on BOTH `status = IN_PROGRESS` and `NOT heartbeat_expected`, so it can never touch a
   * heartbeating run (which has a sweeper of its own and may be genuinely live) nor re-settle a
   * terminal row. STALE, not COMPLETED/CANCELLED/FAILED: a human clicking this knows contact was
   * lost, not how the work ended, and `settleCliPlanRun`'s honest-report statuses must stay the
   * agent's to claim. Deliberately does NOT touch plan or task status — same invariant as the sweep.
   *
   * Returns the updated run, or null when the row did not match the guard (already terminal, or
   * heartbeating) — the caller distinguishes the two by reading the row back.
   */
  async forceSettleUnsupervisedRun(planRunId: string): Promise<PlanRun | null> {
    const repo = this.getRepository();
    const result = await repo
      .createQueryBuilder()
      .update(PlanRun)
      .set({
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.STALE,
        workerId: null,
      })
      .where('id = :planRunId', { planRunId })
      .andWhere('status = :status', { status: PLAN_RUN_STATUS.IN_PROGRESS })
      .andWhere('NOT heartbeat_expected')
      .execute();

    if ((result.affected ?? 0) === 0) {
      return null;
    }

    return repo.findOne({ where: { id: planRunId } });
  }

  /**
   * @description Settles a stale run to the terminal STALE status and clears its
   * run-location columns. Guarded on status = IN_PROGRESS so a concurrent settle (a
   * graceful exit landing between the sweep's find and this update) never clobbers a
   * row that already reached a terminal status. Idempotent. Returns the updated run, or
   * null when the row no longer matched (already settled elsewhere).
   */
  async settleStaleRun(planRunId: string): Promise<PlanRun | null> {
    const repo = this.getRepository();

    await repo.update(
      { id: planRunId, status: PLAN_RUN_STATUS.IN_PROGRESS },
      {
        hostname: null,
        pid: null,
        status: PLAN_RUN_STATUS.STALE,
        workerId: null,
      },
    );

    return repo.findOne({ where: { id: planRunId } });
  }
}
