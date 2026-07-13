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
   * @description Records a queued Ralph run. Upserts by queue/job id so idempotent enqueue calls can round-trip the same audit row.
   * Pass `manager` to enlist the write in a caller-owned transaction (e.g. the atomic enqueue path).
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
    // `readonly unknown[]` members (which it cannot express), keeping upsert cast-free.
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

    const row = repo.create(rowInput);
    await repo.upsert(rowInput, ['queueName', 'bullmqJobId']);

    return (
      (await repo.findOne({
        where: {
          bullmqJobId: input.bullmqJobId,
          queueName: input.queueName,
        },
      })) ?? row
    );
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
}
