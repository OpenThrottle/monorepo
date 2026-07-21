import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import { Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import type { PlanRunConfigSnapshot } from '../plans/plan-run-config/plan-run-config-snapshot.types';
import type { PlanRunKind } from './plan-run.entity';
import { PlanRun } from './plan-run.entity';

interface RecordQueuedPlanRunInput {
  /** User who enqueued the run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  readonly bullmqJobId: string;
  readonly executionBackend: WorkflowConfigRunner;
  readonly planId: string;
  readonly queueName: string;
  readonly runConfigSnapshot?: PlanRunConfigSnapshot | null;
  readonly runKind: PlanRunKind;
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
      bullmqJobId: input.bullmqJobId,
      executionBackend: input.executionBackend,
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
}
