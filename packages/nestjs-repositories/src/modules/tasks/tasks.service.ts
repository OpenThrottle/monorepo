import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Not, Repository } from 'typeorm';
import { Plan } from '../plans/plan.entity';
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

/**
 * @description Per-item shape for {@link TasksService.createTasksBatch}. Mirrors the columns the
 * single-create path writes; requirements is already parsed and status already normalized by the caller.
 */
export interface CreateTaskBatchItem {
  assignee: string | null;
  category: string | null;
  description: string | null;
  project: string | null;
  projectId: string | null;
  requirements: unknown[];
  sortOrder: number | null;
  status: string;
  summary: string | null;
  title: string;
}

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
   * @description Atomically create many tasks for one plan in a single transaction. Omitted sortOrders
   * append MAX+{@link TASK_SORT_ORDER_GAP} stepping in array order (computed once inside the tx);
   * explicit per-item sortOrders are kept. Any failure (e.g. a sortOrder unique violation) rolls back
   * the whole batch — no partially-created plan. Returns the saved tasks in input order.
   */
  async createTasksBatch(
    planId: string,
    items: readonly CreateTaskBatchItem[],
  ): Promise<Task[]> {
    if (items.length === 0) return [];

    return this.taskRepository.manager.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);

      // Row-lock the parent plan before reading MAX(sort_order) so concurrent
      // batch creates against the same plan serialize. Under READ COMMITTED the
      // MAX read alone does not lock the gap, so two writers could otherwise
      // compute the same existingMax and assign duplicate sort_order values
      // (which the (plan_id, sort_order) unique index rejects with a 23505,
      // rolling back the whole batch). The lock makes the read see committed
      // prior rows.
      await manager
        .getRepository(Plan)
        .createQueryBuilder('plan')
        .setLock('pessimistic_write')
        .where('plan.id = :planId', { planId })
        .getOne();

      const maxResult = await taskRepo
        .createQueryBuilder('task')
        .select('MAX(task.sortOrder)', 'max')
        .where('task.planId = :planId', { planId })
        .getRawOne<{ max: string | null }>();
      const existingMax =
        maxResult?.max != null && maxResult.max !== ''
          ? Number(maxResult.max)
          : null;

      let nextAuto =
        existingMax != null
          ? existingMax + TASK_SORT_ORDER_GAP
          : TASK_SORT_ORDER_GAP;

      const entities = items.map((item) => {
        const sortOrder = item.sortOrder != null ? item.sortOrder : nextAuto;
        if (item.sortOrder == null) nextAuto += TASK_SORT_ORDER_GAP;

        return taskRepo.create({
          assignee: item.assignee,
          category: item.category,
          description: item.description,
          planId,
          project: item.project,
          projectId: item.projectId,
          requirements: item.requirements,
          sortOrder,
          status: item.status,
          summary: item.summary,
          title: item.title,
        });
      });

      return taskRepo.save(entities);
    });
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

  /**
   * @description Downward reconcile: when a plan's last unfinished task completes, mark the plan
   * COMPLETED. Acts only on a plan that is currently IN_PROGRESS and has no remaining tasks (PENDING,
   * QUEUED, IN_PROGRESS, or BLOCKED) — COMPLETED/SKIPPED/CANCELED are terminal. The guarded atomic
   * UPDATE keeps it idempotent and race-safe (mirrors {@link syncParentPlanStatus}); the IN_PROGRESS
   * guard avoids resurrecting CANCELED/PENDING/BACKLOG plans. Returns whether the plan was completed.
   *
   * Without this, the only thing that completes a plan is the Ralph orchestrator's top-of-loop check,
   * which several exit paths (agent completion signal, max iterations, cancellation) skip — stranding
   * a plan IN_PROGRESS with every task COMPLETED.
   */
  async completeParentPlanIfTasksDone(planId: string): Promise<boolean> {
    const remaining = await this.taskRepository.count({
      where: {
        planId,
        status: In(['BLOCKED', 'IN_PROGRESS', 'PENDING', 'QUEUED']),
      },
    });

    if (remaining > 0) {
      return false;
    }

    const planRepo = this.plansService.getRepository();
    const result = await planRepo.update(
      { id: planId, status: 'IN_PROGRESS' },
      { status: 'COMPLETED' },
    );

    return (result.affected ?? 0) > 0;
  }
}
