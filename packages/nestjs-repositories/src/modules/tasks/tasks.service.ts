import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, Not, Repository } from 'typeorm';
import { Plan } from '../plans/plan.entity';
import { PlansService } from '../plans/plans.service';
import { Task } from './task.entity';

/** Gap between auto-assigned sortOrder values within a plan. */
export const TASK_SORT_ORDER_GAP = 1000;

/** Side of an anchor a hook/task is allocated on. */
export type HookAdjacencySide = 'after' | 'before';

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
   * @description Midpoint sort_order beside an anchor on the given side, or null
   * when the integer gap to the neighbor on that side is exhausted (|gap| <= 1)
   * so the caller must {@link rebalancePlanSortOrders} first. When the anchor is
   * the plan edge on that side, steps out by {@link TASK_SORT_ORDER_GAP}. Keeps
   * before-hooks immediately before their anchor and after-hooks immediately
   * after, so a before/anchor/after group stays adjacent.
   */
  async midpointBesideAnchor(
    planId: string,
    anchorSortOrder: number,
    side: HookAdjacencySide,
    repository: Repository<Task> = this.taskRepository,
  ): Promise<number | null> {
    const base = repository
      .createQueryBuilder('task')
      .select('task.sortOrder', 'value')
      .where('task.planId = :planId', { planId });

    if (side === 'before') {
      const neighbor = await base
        .clone()
        .andWhere('task.sortOrder < :anchor', { anchor: anchorSortOrder })
        .orderBy('task.sortOrder', 'DESC')
        .getRawOne<{ value: string }>();
      if (neighbor?.value == null) {
        return anchorSortOrder - TASK_SORT_ORDER_GAP;
      }
      const lo = Number(neighbor.value);
      if (anchorSortOrder - lo <= 1) return null;
      return Math.floor((lo + anchorSortOrder) / 2);
    }

    const neighbor = await base
      .clone()
      .andWhere('task.sortOrder > :anchor', { anchor: anchorSortOrder })
      .orderBy('task.sortOrder', 'ASC')
      .getRawOne<{ value: string }>();
    if (neighbor?.value == null) {
      return anchorSortOrder + TASK_SORT_ORDER_GAP;
    }
    const hi = Number(neighbor.value);
    if (hi - anchorSortOrder <= 1) return null;
    return Math.floor((anchorSortOrder + hi) / 2);
  }

  /**
   * @description Renumbers every task in a plan onto a {@link TASK_SORT_ORDER_GAP}
   * stride (1000, 2000, …) in canonical order (sort_order ASC, created_at ASC),
   * reclaiming integer room for midpoint insertion. Two bulk passes in one
   * transaction — park into a disjoint negative band, then restamp — avoid
   * transient UNIQUE(plan_id, sort_order) collisions. Optionally reuses a caller
   * manager to participate in an outer transaction.
   */
  async rebalancePlanSortOrders(
    planId: string,
    manager = this.taskRepository.manager,
  ): Promise<void> {
    const run = async (tx: typeof manager): Promise<void> => {
      await tx.query(
        `UPDATE tasks AS t
         SET sort_order = -ranked.rn
         FROM (
           SELECT id, ROW_NUMBER() OVER (
             ORDER BY sort_order ASC, created_at ASC
           ) AS rn
           FROM tasks WHERE plan_id = $1
         ) AS ranked
         WHERE t.id = ranked.id`,
        [planId],
      );
      await tx.query(
        `UPDATE tasks AS t
         SET sort_order = ranked.rn * $2
         FROM (
           SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order DESC) AS rn
           FROM tasks WHERE plan_id = $1
         ) AS ranked
         WHERE t.id = ranked.id`,
        [planId, TASK_SORT_ORDER_GAP],
      );
    };
    return manager === this.taskRepository.manager
      ? this.taskRepository.manager.transaction(run)
      : run(manager);
  }

  /**
   * @description Allocates a sort_order immediately before/after an anchor task,
   * rebalancing the plan and retrying once when the integer gap is exhausted.
   * Throws when the anchor is not in the plan or no slot exists post-rebalance.
   * The read + rebalance run under a plan row-lock so concurrent allocations
   * serialize; the returned slot is intended for an insert within the same flow.
   */
  async allocateSortOrderBesideAnchor(
    planId: string,
    anchorTaskId: string,
    side: HookAdjacencySide,
  ): Promise<number> {
    return this.taskRepository.manager.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);
      await manager
        .getRepository(Plan)
        .createQueryBuilder('plan')
        .setLock('pessimistic_write')
        .where('plan.id = :planId', { planId })
        .getOne();

      const anchor = await taskRepo.findOne({
        where: { id: anchorTaskId, planId },
      });
      if (anchor == null) {
        throw new Error(
          `anchor task ${anchorTaskId} not found in plan ${planId}`,
        );
      }

      const first = await this.midpointBesideAnchor(
        planId,
        anchor.sortOrder,
        side,
        taskRepo,
      );
      if (first != null) return first;

      await this.rebalancePlanSortOrders(planId, manager);
      const fresh = await taskRepo.findOne({
        select: { sortOrder: true },
        where: { id: anchorTaskId },
      });
      const retried = await this.midpointBesideAnchor(
        planId,
        fresh?.sortOrder ?? anchor.sortOrder,
        side,
        taskRepo,
      );
      if (retried == null) {
        throw new Error(
          `no sort_order slot beside anchor ${anchorTaskId} after rebalance`,
        );
      }
      return retried;
    });
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
          completedAt: item.status === 'COMPLETED' ? new Date() : null,
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
    // Clear completedAt when leaving COMPLETED (e.g. re-open); null is a no-op for other statuses.
    const result = await planRepo.update(
      { id: planId, status: Not('IN_PROGRESS') },
      { completedAt: null, status: 'IN_PROGRESS' },
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
      { completedAt: new Date(), status: 'COMPLETED' },
    );

    return (result.affected ?? 0) > 0;
  }
}
