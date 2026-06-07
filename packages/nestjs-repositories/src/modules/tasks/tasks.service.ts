import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Not, Repository } from 'typeorm';
import { PlansService } from '../plans/plans.service';
import { Task } from './task.entity';

/** Gap between auto-assigned sortOrder values within a plan. */
export const TASK_SORT_ORDER_GAP = 1000;

/** Canonical order for plan-scoped task list queries. */
export const PLAN_TASK_LIST_ORDER = {
  createdAt: 'ASC',
  sortOrder: 'ASC',
} as const;

/** Canonical order for cross-plan task list queries (within each plan). */
export const CROSS_PLAN_TASK_LIST_ORDER = {
  createdAt: 'ASC',
  planId: 'ASC',
  sortOrder: 'ASC',
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {
    this.logger.debug('🧩 tasks 🧩');
  }

  /**
   * @description Returns the TypeORM repository for tasks. Use for CRUD and queries.
   */
  getRepository(): Repository<Task> {
    return this.taskRepository;
  }

  /**
   * @description Next sortOrder for a new task when omitted on create: 1000 for first task in plan, otherwise MAX(sort_order) + {@link TASK_SORT_ORDER_GAP}.
   */
  async resolveNextSortOrder(planId: string): Promise<number> {
    const result = await this.taskRepository
      .createQueryBuilder('task')
      .select('MAX(task.sortOrder)', 'max')
      .where('task.planId = :planId', { planId })
      .getRawOne<{ max: string | null }>();

    const max =
      result?.max != null && result.max !== '' ? Number(result.max) : null;

    return max != null ? max + TASK_SORT_ORDER_GAP : TASK_SORT_ORDER_GAP;
  }

  /**
   * @description When a task is IN_PROGRESS, sets its parent plan to IN_PROGRESS if not already (atomic UPDATE; idempotent and safe under concurrent writers). Returns whether a plan row was updated.
   */
  async syncParentPlanStatus(planId: string): Promise<boolean> {
    const planRepo = this.plansService.getRepository();
    const result = await planRepo.update(
      { id: planId, status: Not('IN_PROGRESS') },
      { status: 'IN_PROGRESS' },
    );

    return (result.affected ?? 0) > 0;
  }
}
