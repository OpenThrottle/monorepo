import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import { Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { PlanRunConfigSnapshot } from '@openthrottle/openthrottle-plan-config';
import { PLAN_RUN_STATUS } from './plan-runs.constants';
import type { PlanRunExecutionBackend, PlanRunKind } from './plan-run.entity';
import { PlanRun } from './plan-run.entity';

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
  readonly runConfigSnapshot?: PlanRunConfigSnapshot | null;
  readonly runKind: PlanRunKind;
}

/**
 * Input for a detached workflow-ralph CLI run row. The CLI carries no BullMQ job
 * and drives its own iteration loop, so the row is inserted with a null
 * bullmqJobId and runKind 'orchestrator'.
 */
interface RegisterCliPlanRunInput {
  /** User who started the CLI run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  readonly executionBackend: PlanRunExecutionBackend;
  readonly hostname: string | null;
  readonly pid: number | null;
  readonly planId: string;
  readonly workerId: string | null;
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
   * @description Records a queued Ralph run, idempotent per (queueName, bullmqJobId) so repeated
   * enqueue calls round-trip the same audit row (refreshing the mutable enqueue fields).
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
      runConfigSnapshot,
      runKind: input.runKind,
      status: 'QUEUED',
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

    return repo.save(
      repo.create({
        actorUserId: input.actorUserId ?? null,
        bullmqJobId: null,
        executionBackend: input.executionBackend,
        hostname: input.hostname,
        // Stamp the initial heartbeat at creation so the run is immediately alive
        // (avoids a false-stale window before the CLI's first heartbeat tick).
        lastHeartbeatAt: new Date(),
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
   * PlanRunCancellationService.attach). Best-effort by key; matches 0 rows for a run that was never
   * recorded (e.g. legacy). Returns the number of rows updated.
   */
  async markRunStarted(location: RunLocation): Promise<number> {
    const result = await this.getRepository().update(
      { bullmqJobId: location.bullmqJobId, queueName: location.queueName },
      {
        hostname: location.hostname,
        // Stamp the initial heartbeat when the worker picks up the job, so the run
        // is immediately alive before the processor's first heartbeat tick.
        lastHeartbeatAt: new Date(),
        pid: location.pid,
        workerId: location.workerId,
      },
    );

    return result.affected ?? 0;
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
   * @description Stamps the durable cancel-request marker (cancel_requested_at/by) on the plan's
   * NEWEST run row — which is the currently-active run (each enqueue/CLI start inserts a fresh row).
   * Keying on the newest row (rather than "any located run") keeps {@link readCancelRequested}
   * symmetric and prevents a stale marker on an older, finished run from bleeding onto a later run.
   * This is the cross-process/host/CLI stop guarantee: the run loop polls the marker at each
   * iteration boundary. Returns the run id that was marked, or null when the plan has no run row.
   */
  async stampCancelRequested(
    planId: string,
    requestedByUserId: string | null,
  ): Promise<string | null> {
    const repo = this.getRepository();
    const target = await repo.findOne({
      order: { createdAt: 'DESC' },
      where: { planId },
    });

    if (!target) {
      return null;
    }

    await repo.update(
      { id: target.id },
      { cancelRequestedAt: new Date(), cancelRequestedBy: requestedByUserId },
    );

    return target.id;
  }

  /**
   * @description Reads the durable cancel-request marker for a plan's active run (the run loop's
   * iteration-boundary fallback when the pub/sub fast-path message was missed). Scoped to the NEWEST
   * run row so a fresh run never inherits a prior run's marker; returns its marker when set, else
   * null.
   */
  async readCancelRequested(planId: string): Promise<CancelMarker | null> {
    const run = await this.getRepository().findOne({
      order: { createdAt: 'DESC' },
      where: { planId },
    });

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
   * @description Finds IN_PROGRESS runs whose liveness is older than `cutoff` — i.e.
   * stranded by a hard crash (SIGKILL/power-loss) that skipped the graceful settle path.
   * Uses COALESCE(last_heartbeat_at, created_at) so rows that never heartbeated (legacy,
   * or crashed before their first tick) are also caught once old enough. Newest-relevant
   * ordering is irrelevant to a sweep, so returns oldest-first, capped at `limit`.
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
      .andWhere('COALESCE(run.last_heartbeat_at, run.created_at) < :cutoff', {
        cutoff,
      })
      .orderBy('run.created_at', 'ASC')
      .take(limit)
      .getMany();
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
