import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SortOrderReorderResult } from '@openthrottle/nestjs-postgres';
import {
  appendSortOrder,
  BaseRepository,
  edgeSortOrder,
  insertBeside,
  rebalanceScope,
  reorderInScope,
  SORT_ORDER_EDGE,
} from '@openthrottle/nestjs-postgres';
import {
  And,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';

import { REMAINING_TASK_STATUSES } from '../../plan-task-status/plan-task-status.constants.ts';
import { Task } from './task.entity.ts';
import {
  PLAN_TASK_LIST_ORDER,
  TASKS_SORT_ORDER_SCOPE,
} from './tasks.constants.ts';
import type {
  CountTasksByDateRangeParams,
  CreateTaskBatchItem,
  GroupedHooks,
  HookAdjacencySide,
  HookTaskInput,
  NeighborSortOrderParams,
  TaskCreateInput,
  TaskHookScope,
} from './tasks.types.ts';

/**
 * @description Data access for the openthrottle `tasks` table on the default connection: the
 * `BaseRepository` CRUD plus sort-order allocation, lifecycle hooks, batch create and the
 * remaining-task and per-plan counts. A delete is a soft delete, and `(plan_id, sort_order)`
 * is unique among live tasks only (`idx_tasks_plan_id_sort_order_live`), so every read of
 * `sort_order` here is over live rows.
 * @public
 */
@Injectable()
export class TasksRepository extends BaseRepository<Task, TaskCreateInput> {
  protected readonly tableName = 'tasks';

  constructor(
    @InjectRepository(Task)
    repository: Repository<Task>,
  ) {
    super(repository);
  }

  /**
   * @description Soft deletes a live task and its live child tasks (hooks and subtasks,
   * `parent_task_id`) in one transaction, then returns the deleted task. The soft delete
   * fires no foreign key action, so the old `parent_task_id` CASCADE is done here. Its
   * embeddings and output history stay in place, reachable only through the deleted task.
   * @throws NotFoundException when no live task has that id (including already deleted).
   */
  override async remove(id: string): Promise<Task> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.softDelete(Task, {
        deletedAt: IsNull(),
        id,
      });
      if (!result.affected) {
        throw new NotFoundException(
          `${this.tableName} record with ID "${id}" not found`,
        );
      }
      await manager.softDelete(Task, { deletedAt: IsNull(), parentTaskId: id });
      return manager.findOneOrFail(Task, { where: { id }, withDeleted: true });
    });
  }

  /**
   * @description Next sortOrder for a new task when omitted on create: one gap past the
   * plan's last live task, or one gap for an empty plan.
   */
  async resolveNextSortOrder(planId: string): Promise<number> {
    return appendSortOrder(
      this.repository.manager,
      TASKS_SORT_ORDER_SCOPE,
      planId,
    );
  }

  /**
   * @description Renumbers every live task in a plan onto the gap stride (1000, 2000, …) in
   * canonical order (sort_order, then created_at), reclaiming room for midpoint inserts.
   * Soft-deleted tasks are neither ranked nor touched. Pass `manager` to join an outer
   * transaction.
   */
  async rebalancePlanSortOrders(
    planId: string,
    manager = this.repository.manager,
  ): Promise<void> {
    await rebalanceScope(manager, TASKS_SORT_ORDER_SCOPE, planId);
  }

  /**
   * @description Reorders the listed tasks among the sort values they already hold, leaving
   * every unlisted task where it is. See `reorderInScope`.
   */
  async reorderInPlan(
    planId: string,
    taskIds: readonly string[],
  ): Promise<SortOrderReorderResult> {
    return reorderInScope(
      this.repository.manager,
      TASKS_SORT_ORDER_SCOPE,
      planId,
      taskIds,
    );
  }

  /**
   * @description Allocates a sort_order immediately before/after an anchor task,
   * rebalancing the plan and retrying once when the integer gap is exhausted. Runs under the
   * plan's sort-order lock, so concurrent allocations serialize; the returned slot is
   * intended for an insert within the same flow.
   * @throws Error when the anchor is not a live task of the plan, or no slot exists after a
   * rebalance.
   */
  async allocateSortOrderBesideAnchor(
    planId: string,
    anchorTaskId: string,
    side: HookAdjacencySide,
  ): Promise<number> {
    const result = await insertBeside(
      this.repository.manager,
      TASKS_SORT_ORDER_SCOPE,
      planId,
      anchorTaskId,
      side,
    );

    if (result.kind === 'anchor-not-found') {
      throw new Error(
        `anchor task ${anchorTaskId} not found in plan ${planId}`,
      );
    }
    if (result.kind === 'no-room') {
      throw new Error(
        `no sort_order slot beside anchor ${anchorTaskId} after rebalance`,
      );
    }

    return result.sortOrder;
  }

  /**
   * @description Attach a before-hook to a plan (anchorTaskId omitted → plan-level
   * beforeAll/beforeEach) or to a task (anchorTaskId set → per-task before). See
   * {@link addHook}.
   */
  async addBeforeHook(
    planId: string,
    anchorTaskId: string | null,
    input: HookTaskInput,
  ): Promise<Task> {
    return this.addHook(planId, anchorTaskId, 'before', input);
  }

  /**
   * @description Attach an after-hook to a plan (anchorTaskId omitted → plan-level
   * afterAll/afterEach) or to a task (anchorTaskId set → per-task after). See
   * {@link addHook}.
   */
  async addAfterHook(
    planId: string,
    anchorTaskId: string | null,
    input: HookTaskInput,
  ): Promise<Task> {
    return this.addHook(planId, anchorTaskId, 'after', input);
  }

  /**
   * @description Detaches (soft deletes) a hook task by id. Only live rows that are hooks
   * (hook_role set) are removable this way; deleting a regular task goes through
   * {@link TasksRepository.remove}. Returns whether a hook row was removed.
   */
  async detachHook(hookTaskId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      deletedAt: IsNull(),
      hookRole: Not(IsNull()),
      id: hookTaskId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Task-level hooks anchored to a task, grouped before/after in
   * execution order (sort_order ASC, created_at ASC).
   */
  async getTaskHooks(taskId: string): Promise<GroupedHooks> {
    const hooks = await this.repository.find({
      order: PLAN_TASK_LIST_ORDER,
      where: { hookRole: Not(IsNull()), parentTaskId: taskId },
    });
    return this.groupHooks(hooks);
  }

  /**
   * @description Plan-level hooks (parent_task_id NULL, hook_role set), grouped
   * before/after in execution order. These are the beforeAll/afterAll (once) and
   * beforeEach/afterEach (each) hooks.
   */
  async getPlanHooks(planId: string): Promise<GroupedHooks> {
    const hooks = await this.repository.find({
      order: PLAN_TASK_LIST_ORDER,
      where: { hookRole: Not(IsNull()), parentTaskId: IsNull(), planId },
    });
    return this.groupHooks(hooks);
  }

  /**
   * @description Batched {@link getPlanHooks}: plan-level hooks for many plans in
   * a single query, keyed by plan id. Plans with no hooks are absent from the
   * map. Backs the request-scoped `planHooksByPlanIdLoader`, so a query selecting
   * both `beforeHooks` and `afterHooks` — and one selecting them across a list of
   * plans — costs one round-trip rather than one per field per plan.
   */
  async getPlanHooksForPlans(
    planIds: readonly string[],
  ): Promise<Map<string, GroupedHooks>> {
    const uniqueIds = [...new Set(planIds)];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const hooks = await this.repository.find({
      order: PLAN_TASK_LIST_ORDER,
      where: {
        hookRole: Not(IsNull()),
        parentTaskId: IsNull(),
        planId: In(uniqueIds),
      },
    });

    const byPlanId = new Map<string, Task[]>();
    for (const hook of hooks) {
      if (hook.planId == null) continue;
      const list = byPlanId.get(hook.planId) ?? [];
      list.push(hook);
      byPlanId.set(hook.planId, list);
    }

    return new Map(
      [...byPlanId].map(([planId, list]) => [planId, this.groupHooks(list)]),
    );
  }

  private groupHooks(hooks: Task[]): GroupedHooks {
    return {
      after: hooks.filter((hook) => hook.hookRole === 'after'),
      before: hooks.filter((hook) => hook.hookRole === 'before'),
    };
  }

  /**
   * @description Materializes a hook task. Plan-level (anchorTaskId null) hooks
   * land at the plan head (before) / tail (after) band and carry a hook_scope
   * ('once' default, or 'each' to expand per-task at run time); task-level hooks
   * are allocated immediately beside their anchor via
   * {@link allocateSortOrderBesideAnchor}. Enforces the invariants the DB CHECKs
   * cannot: source=skill ⇒ skillSlug present; scope is plan-level only; and the
   * one-level-nesting rule — the anchor must be a regular task, not itself a hook.
   */
  private async addHook(
    planId: string,
    anchorTaskId: string | null,
    role: HookAdjacencySide,
    input: HookTaskInput,
  ): Promise<Task> {
    if (input.source === 'skill' && !input.skillSlug) {
      throw new Error("hook source 'skill' requires a skillSlug");
    }
    if (input.source === 'template' && input.skillSlug != null) {
      throw new Error("hook source 'template' must not carry a skillSlug");
    }

    const isPlanLevel = anchorTaskId == null;
    if (!isPlanLevel && input.scope != null) {
      throw new Error('hook_scope is only valid for plan-level hooks');
    }
    const scope: TaskHookScope | null = isPlanLevel
      ? (input.scope ?? 'once')
      : null;

    let sortOrder: number;
    if (isPlanLevel) {
      sortOrder = await this.resolvePlanEdgeSortOrder(planId, role);
    } else {
      const anchor = await this.repository.findOne({
        where: { id: anchorTaskId, planId },
      });
      if (anchor == null) {
        throw new Error(
          `anchor task ${anchorTaskId} not found in plan ${planId}`,
        );
      }
      if (anchor.hookRole != null) {
        throw new Error(
          'hooks are one level deep: the anchor must be a regular task',
        );
      }
      sortOrder = await this.allocateSortOrderBesideAnchor(
        planId,
        anchorTaskId,
        role,
      );
    }

    const entity = this.repository.create({
      description: input.description ?? null,
      hookRole: role,
      hookScope: scope,
      hookSource: input.source,
      parentTaskId: anchorTaskId,
      planId,
      skillSlug: input.source === 'skill' ? (input.skillSlug ?? null) : null,
      sortOrder,
      status: 'PENDING',
      title: input.title ?? this.defaultHookTitle(role, input),
    });
    return this.repository.save(entity);
  }

  private defaultHookTitle(
    role: HookAdjacencySide,
    input: HookTaskInput,
  ): string {
    const body = input.source === 'skill' ? `/${input.skillSlug}` : 'hook task';
    return `${role}: ${body}`;
  }

  /**
   * @description Plan-edge sort_order for a plan-level hook: before → one gap below the first
   * live task, after → one gap past the last (an empty plan starts at one gap), so plan
   * hooks bookend the task list.
   */
  private async resolvePlanEdgeSortOrder(
    planId: string,
    role: HookAdjacencySide,
  ): Promise<number> {
    const edge =
      role === 'before' ? SORT_ORDER_EDGE.START : SORT_ORDER_EDGE.END;

    return edgeSortOrder(
      this.repository.manager,
      TASKS_SORT_ORDER_SCOPE,
      planId,
      edge,
    );
  }

  /**
   * @description Atomically create many tasks for one plan in a single transaction. Omitted sortOrders
   * append one gap past the last live task, stepping in array order (computed once inside the tx, over live tasks);
   * explicit per-item sortOrders are kept. Any failure (e.g. a sortOrder unique violation) rolls back
   * the whole batch — no partially-created plan. Returns the saved tasks in input order.
   */
  async createTasksBatch(
    planId: string,
    items: readonly CreateTaskBatchItem[],
  ): Promise<Task[]> {
    if (items.length === 0) return [];

    return this.repository.manager.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Task);

      // The append read takes the plan's sort-order lock for the rest of this transaction,
      // so concurrent batch creates against one plan serialize instead of computing the same
      // next value and tripping the live (plan_id, sort_order) unique index.
      let nextAuto = await appendSortOrder(
        manager,
        TASKS_SORT_ORDER_SCOPE,
        planId,
      );

      const entities = items.map((item) => {
        const sortOrder = item.sortOrder != null ? item.sortOrder : nextAuto;
        if (item.sortOrder == null) nextAuto += TASKS_SORT_ORDER_SCOPE.gap;

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
          wave: item.wave,
        });
      });

      return taskRepo.save(entities);
    });
  }

  /**
   * @description Whether `planId` still has a non-terminal task — membership is
   * {@link REMAINING_TASK_STATUSES} (BLOCKED, IN_PROGRESS, PENDING, QUEUED). COMPLETED, SKIPPED,
   * CANCELED and PROMOTED (the work continued as its own plan) are resolved, so a plan whose last
   * open task is promoted still completes. This is the read-only "should the plan complete?" half of
   * the downward reconcile that marks a plan COMPLETED when its last task finishes — the guarded
   * write itself lives in `PlanStatusService.completeParentPlanIfTasksDone` (server), the one legal
   * place that writes `plans.status`, so it can attribute the write and capture a status_change
   * artifact. The same status list gates COMPLETED writes inside `applyStatusChange`.
   *
   * Without the downstream write, the only thing that completes a plan is the plan-run orchestrator's
   * top-of-loop check, which several exit paths (agent completion signal, max iterations,
   * cancellation) skip — stranding a plan IN_PROGRESS with every task COMPLETED.
   */
  async hasRemainingTasks(planId: string): Promise<boolean> {
    const remaining = await this.repository.count({
      where: {
        planId,
        status: In([...REMAINING_TASK_STATUSES]),
      },
    });

    return remaining > 0;
  }

  /**
   * @description Live task counts for many plans in one grouped query, keyed by plan id.
   * `statuses`, when given and non-empty, counts only tasks in those statuses (e.g. the
   * resolved ones for a progress bar). Plans with no matching tasks are absent from the map,
   * so callers default to 0. Soft-deleted tasks are never counted.
   */
  async countByPlanIds(
    planIds: readonly string[],
    statuses?: readonly string[],
  ): Promise<Map<string, number>> {
    const uniqueIds = [...new Set(planIds)];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const query = this.repository
      .createQueryBuilder('task')
      .select('task.planId', 'planId')
      .addSelect('COUNT(*)', 'count')
      .where('task.planId IN (:...planIds)', { planIds: uniqueIds })
      .andWhere('task.deletedAt IS NULL');

    if (statuses != null && statuses.length > 0) {
      query.andWhere('task.status IN (:...statuses)', {
        statuses: [...statuses],
      });
    }

    const rows = await query
      .groupBy('task.planId')
      .getRawMany<{ count: string; planId: string }>();

    return new Map(
      rows.map((row) => {
        return [row.planId, Number(row.count)];
      }),
    );
  }

  /**
   * @description Live tasks whose id starts with `prefix`, compared against the hyphen-stripped
   * id so a fragment that spans a UUID hyphen still matches. Newest first, capped at `limit`,
   * with the owning plan's id and title joined in. Only the ref columns are loaded. `prefix`
   * must already be validated hex: it is bound as a parameter but carries no LIKE escaping.
   */
  async findByIdPrefix(prefix: string, limit: number): Promise<Task[]> {
    return (
      this.repository
        .createQueryBuilder('task')
        .leftJoin('task.plan', 'plan', 'plan.deletedAt IS NULL')
        .select([
          'task.id',
          'task.planId',
          'task.status',
          'task.title',
          'plan.id',
          'plan.title',
        ])
        .where(`REPLACE(task.id::text, '-', '') ILIKE :pattern`, {
          pattern: `${prefix}%`,
        })
        .andWhere('task.deletedAt IS NULL')
        .orderBy('task.updatedAt', 'DESC')
        // `limit`, not `take`: with a join, `take` wraps the query in a DISTINCT subquery that
        // cannot order by an unselected column. The plan join is many-to-one, so it never
        // multiplies task rows and LIMIT is exact.
        .limit(limit)
        .getMany()
    );
  }

  /**
   * @description How many live tasks a project has, for paginating its task list.
   */
  async countByProjectId(projectId: string): Promise<number> {
    return this.repository.count({ where: { projectId } });
  }

  /**
   * @description How many live tasks have `column` inside `[dayStart, dayEnd)`, for the daily
   * stats aggregate. `completedAt` is the immutable completion stamp, so a completion lands on
   * the day it happened rather than on the last day the row was touched.
   */
  async countByDateRange(params: CountTasksByDateRangeParams): Promise<number> {
    return this.repository.count({
      where: {
        [params.column]: And(
          MoreThanOrEqual(params.dayStart),
          LessThan(params.dayEnd),
        ),
      },
    });
  }

  /**
   * @description The live task of `planId` with the lowest `sort_order` whose title or
   * description contains `text`, compared case-insensitively; null when none does. `text` is
   * bound as a parameter but carries no LIKE escaping.
   */
  async findFirstMentioning(
    planId: string,
    text: string,
  ): Promise<Task | null> {
    return this.repository
      .createQueryBuilder('task')
      .where('task.planId = :planId', { planId })
      .andWhere('task.deletedAt IS NULL')
      .andWhere(
        '(task.title ILIKE :reference OR task.description ILIKE :reference)',
        { reference: `%${text}%` },
      )
      .orderBy('task.sortOrder', 'ASC')
      .getOne();
  }

  /**
   * @description The live task of `planId` with the lowest `sort_order` whose title contains
   * `text`, compared case-insensitively; null when none does. `text` is bound as a parameter
   * but carries no LIKE escaping.
   */
  async findFirstByTitleContaining(
    planId: string,
    text: string,
  ): Promise<Task | null> {
    return this.repository
      .createQueryBuilder('task')
      .where('task.planId = :planId', { planId })
      .andWhere('task.deletedAt IS NULL')
      .andWhere('task.title ILIKE :match', { match: `%${text}%` })
      .orderBy('task.sortOrder', 'ASC')
      .getOne();
  }

  /**
   * @description MIN or MAX `sort_order` over the live tasks of `planId`, leaving out
   * `excludeTaskIds`; null when no task is left. The edge of the plan's order, for placing a
   * task before the first or after the last.
   */
  async getSortOrderExtent(
    planId: string,
    aggregate: 'MAX' | 'MIN',
    excludeTaskIds: readonly string[] = [],
  ): Promise<number | null> {
    const query = this.repository
      .createQueryBuilder('task')
      .select(`${aggregate}(task.sortOrder)`, 'value')
      .where('task.planId = :planId', { planId })
      .andWhere('task.deletedAt IS NULL');

    if (excludeTaskIds.length > 0) {
      query.andWhere('task.id NOT IN (:...excludeTaskIds)', {
        excludeTaskIds: [...excludeTaskIds],
      });
    }

    const result = await query.getRawOne<{ value: string | null }>();

    return result?.value != null && result.value !== ''
      ? Number(result.value)
      : null;
  }

  /**
   * @description The `sort_order` of the live task nearest the anchor on `side`, leaving out
   * `excludeTaskId`: the smallest one above the anchor for `after`, the largest one below it
   * for `before`. Null when nothing sits on that side.
   */
  async getNeighborSortOrder(
    params: NeighborSortOrderParams,
  ): Promise<number | null> {
    const isAfter = params.side === 'after';
    const result = await this.repository
      .createQueryBuilder('task')
      .select(`${isAfter ? 'MIN' : 'MAX'}(task.sortOrder)`, 'value')
      .where('task.planId = :planId', { planId: params.planId })
      .andWhere('task.deletedAt IS NULL')
      .andWhere('task.id != :taskId', { taskId: params.excludeTaskId })
      .andWhere(`task.sortOrder ${isAfter ? '>' : '<'} :anchor`, {
        anchor: params.anchorSortOrder,
      })
      .getRawOne<{ value: string | null }>();

    return result?.value != null && result.value !== ''
      ? Number(result.value)
      : null;
  }
}
