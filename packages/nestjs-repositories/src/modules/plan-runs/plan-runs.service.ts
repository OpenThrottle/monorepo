import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import type { PlanRunExecutionBackend, PlanRunKind } from './plan-run.entity';
import { PlanRun } from './plan-run.entity';

interface RecordQueuedPlanRunInput {
  readonly bullmqJobId: string;
  readonly executionBackend: PlanRunExecutionBackend;
  readonly planId: string;
  readonly queueName: string;
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
   */
  async recordQueuedRun(input: RecordQueuedPlanRunInput): Promise<PlanRun> {
    const repo = this.getRepository();
    const rowInput = {
      bullmqJobId: input.bullmqJobId,
      executionBackend: input.executionBackend,
      planId: input.planId,
      queueName: input.queueName,
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
