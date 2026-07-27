/**
 * @description The 'inject-task' ActionExecutor: a matched rule requires the
 * plan to contain a task that runs /<skillSlug>. Runs only for first-time
 * (rule, plan) pairs (the worker's fingerprint pre-check), then:
 *
 * 1. pre-satisfied — an existing task referencing /<skillSlug> in its title or
 *    description (ANY status, including COMPLETED) ledgers 'pre-satisfied'
 *    with that task's id; nothing is injected.
 * 2. candidate-set gating — the plan-aware availability read (owner
 *    vocabulary + ephemeral availability-exception rules): the slug must
 *    exist in the resolved plan-context universe with model invocation not
 *    effectively disabled; failure ledgers 'flagged'
 *    {reason: 'skill-unavailable'}. An unresolvable project universe skips
 *    the gate.
 * 3. inject — placement 'first' = MIN(sort_order) − 1000, 'last' =
 *    MAX(sort_order) + 1000 (empty plan starts at 1000); 'before'/'after' land
 *    at the midpoint beside an anchor task (renumbering the plan on a 1000
 *    stride when the integer gap is exhausted). One recompute retry on a UNIQUE
 *    (plan_id, sort_order) collision; the description carries a provenance
 *    footer (rule id, matched tags, fingerprint).
 * 4. ledger 'applied' + task_id. A lost ledger race (another evaluation
 *    applied concurrently) deletes the just-injected task — the UNIQUE
 *    (rule_id, plan_id) fingerprint stays the single source of truth.
 *
 * Injection is once (the apply-once ledger), but PLACEMENT is a continuously
 * reconciled managed invariant: every later evaluation calls {@link
 * InjectTaskExecutor.reconcile} for the already-'applied' row, which repositions
 * the injected task back to its configured placement against the current task
 * set (so a 'last' task stays last as tasks are added, overriding manual
 * reorders). Reconcile no-ops when the task is already in position, deleted
 * (task_id NULL), or terminal.
 *
 * Actions are never undone: tag removal orphans the ledger row (worker-side),
 * and a human deleting the injected task SET NULLs task_id while the 'applied'
 * row keeps blocking re-injection.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type Plan,
  RULE_APPLICATION_STATES,
  RuleApplicationsService,
  Task,
  TASK_SORT_ORDER_GAP,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  injectTaskActionPayloadSchema,
  TAG_ACTION_TYPES,
  type InjectTaskActionPayload,
  type MatchedTagAction,
} from '@openthrottle/openthrottle-skills';
import { QueryFailedError } from 'typeorm';
import { PlanContextAvailabilityService } from '../../services/plan-context-availability/plan-context-availability.service';
import {
  ActionExecutorRegistry,
  type ActionExecutor,
  type ActionExecutorContext,
  type ActionReconcileContext,
} from './action-executor';
import { isReconcilePlacementEnabled } from './reconcile-placement-policy';

/**
 * @description Task statuses reconcile never repositions: a completed/skipped/
 * canceled injected task is history and stays where it is.
 */
const TERMINAL_TASK_STATUSES: readonly string[] = [
  'CANCELED',
  'COMPLETED',
  'SKIPPED',
];

const isSortOrderUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
};

const applyTemplate = (
  template: string,
  plan: Plan,
  action: MatchedTagAction,
): string =>
  template
    .split('{{plan.id}}')
    .join(plan.id)
    .split('{{plan.title}}')
    .join(plan.title)
    .split('{{matchedTags}}')
    .join(action.matchedTags.join(', '));

@Injectable()
export class InjectTaskExecutor implements ActionExecutor, OnModuleInit {
  readonly actionType = TAG_ACTION_TYPES.INJECT_TASK;

  constructor(
    private readonly configService: ConfigService,
    private readonly executorRegistry: ActionExecutorRegistry,
    private readonly logger: LoggerService,
    private readonly planContextAvailabilityService: PlanContextAvailabilityService,
    private readonly ruleApplicationsService: RuleApplicationsService,
    private readonly tasksService: TasksService,
  ) {}

  onModuleInit(): void {
    this.executorRegistry.register(this);
  }

  async execute(context: ActionExecutorContext): Promise<void> {
    const { action, ownerUserId, plan, rule } = context;
    const payload = injectTaskActionPayloadSchema.parse(action.actionPayload);
    const slugReference = `/${payload.skillSlug}`;

    // 1. Pre-satisfied: any task already referencing the skill, any status.
    const preSatisfying = await this.tasksService
      .getRepository()
      .createQueryBuilder('task')
      .where('task.plan_id = :planId', { planId: plan.id })
      .andWhere(
        '(task.title ILIKE :reference OR task.description ILIKE :reference)',
        { reference: `%${slugReference}%` },
      )
      .orderBy('task.sort_order', 'ASC')
      .getOne();
    if (preSatisfying != null) {
      await this.ruleApplicationsService.record({
        details: { matchedTags: action.matchedTags, reason: 'existing-task' },
        planId: plan.id,
        ruleId: rule.id,
        state: RULE_APPLICATION_STATES.PRE_SATISFIED,
        taskId: preSatisfying.id,
      });
      return;
    }

    // 2. Candidate-set gating via the plan-aware availability read (the
    //    plan owner's vocabulary and exception rules apply).
    const gated =
      await this.planContextAvailabilityService.isSkillUnavailableForPlan(
        plan.id,
        payload.skillSlug,
        ownerUserId,
      );
    if (gated) {
      await this.ruleApplicationsService.record({
        details: {
          matchedTags: action.matchedTags,
          reason: 'skill-unavailable',
          skillSlug: payload.skillSlug,
        },
        planId: plan.id,
        ruleId: rule.id,
        state: RULE_APPLICATION_STATES.FLAGGED,
      });
      return;
    }

    // 3. Inject with gap placement + one recompute retry on collision.
    const task = await this.insertInjectedTask(plan, action, payload);

    // 4. Ledger 'applied'. If another evaluation won the fingerprint race,
    //    remove the duplicate task we just created — the ledger row is the
    //    single source of truth for "this rule already acted on this plan".
    const ledger = await this.ruleApplicationsService.record({
      details: {
        matchedTags: action.matchedTags,
        skillSlug: payload.skillSlug,
      },
      planId: plan.id,
      ruleId: rule.id,
      state: RULE_APPLICATION_STATES.APPLIED,
      taskId: task.id,
    });
    if (ledger.taskId !== task.id) {
      await this.tasksService.getRepository().delete({ id: task.id });
      this.logger.warn(
        `Lost the apply-once race for rule ${rule.id} on plan ${plan.id}; removed duplicate injected task ${task.id}`,
        InjectTaskExecutor.name,
      );
    }
  }

  /**
   * @description Managed-invariant reconcile for an already-'applied' inject-task
   * rule: repositions the injected task back to its configured placement against
   * the CURRENT task set, every pass. This is what keeps a 'last' task last as
   * later tasks are added (the frozen apply-once ledger otherwise never moves
   * it). Authority is the managed invariant — a manual reorder is corrected on
   * the next pass. No-ops when the task is already in position (so steady state
   * writes nothing and there is no thrash), when the task was deleted
   * (task_id NULL — T4 territory), or when it is in a terminal status.
   * Collision-safe: a UNIQUE(plan_id, sort_order) race recomputes once.
   */
  async reconcile(context: ActionReconcileContext): Promise<void> {
    // Kill switch: leave injected tasks at their first-apply position when the
    // continuous reposition is disabled in prod.
    if (!isReconcilePlacementEnabled(this.configService)) return;

    const { action, application, plan } = context;
    const taskId = application.taskId;
    if (taskId == null) return;

    const payload = injectTaskActionPayloadSchema.parse(action.actionPayload);
    const task = await this.tasksService
      .getRepository()
      .findOne({ where: { id: taskId, planId: plan.id } });
    if (task == null) return;
    if (TERMINAL_TASK_STATUSES.includes(task.status)) return;

    if (payload.placement === 'first' || payload.placement === 'last') {
      await this.reconcileEdgePlacement(plan.id, task, payload.placement);
      return;
    }
    await this.reconcileRelativePlacement(plan.id, task, payload);
  }

  /**
   * @description Reconcile a 'first'/'last' injected task: it must sit below the
   * MIN (first) or above the MAX (last) sort_order of every OTHER task. If it
   * already does, no write. Otherwise move it just past that edge on a
   * {@link TASK_SORT_ORDER_GAP} stride. One recompute retry on a collision.
   */
  private async reconcileEdgePlacement(
    planId: string,
    task: Task,
    placement: 'first' | 'last',
  ): Promise<void> {
    const repository = this.tasksService.getRepository();
    const attempt = async (currentSortOrder: number): Promise<boolean> => {
      const aggregate = placement === 'first' ? 'MIN' : 'MAX';
      const extent = await this.planSortOrderExtent(planId, aggregate, task.id);
      if (extent == null) return false; // only task in the plan — nothing to be after/before.
      const inPosition =
        placement === 'first'
          ? currentSortOrder < extent
          : currentSortOrder > extent;
      if (inPosition) return false;
      const target =
        placement === 'first'
          ? extent - TASK_SORT_ORDER_GAP
          : extent + TASK_SORT_ORDER_GAP;
      await repository.update({ id: task.id }, { sortOrder: target });
      this.logger.debug(
        `Reconciled injected task ${task.id} to sort_order ${target} (placement '${placement}', plan ${planId})`,
        InjectTaskExecutor.name,
      );
      return true;
    };

    try {
      await attempt(task.sortOrder);
    } catch (error) {
      if (!isSortOrderUniqueViolation(error)) throw error;
      const fresh = await repository.findOne({
        select: { sortOrder: true },
        where: { id: task.id },
      });
      await attempt(fresh?.sortOrder ?? task.sortOrder);
    }
  }

  /**
   * @description Reconcile a 'before'/'after' injected task: it must sit
   * immediately beside its anchor with no other task between them. If already
   * adjacent, no write. Otherwise re-allocate a slot beside the anchor via the
   * canonical TasksService allocator (which rebalances only when the integer gap
   * is exhausted) and move the task there. One recompute retry on a collision.
   * A missing/unresolvable anchor leaves the task in place.
   */
  private async reconcileRelativePlacement(
    planId: string,
    task: Task,
    payload: InjectTaskActionPayload,
  ): Promise<void> {
    if (payload.anchor == null) return;
    const anchor = await this.resolveAnchorTask(planId, payload.anchor);
    if (anchor == null || anchor.id === task.id) return;

    const side = payload.placement === 'before' ? 'before' : 'after';
    if (await this.isBesideAnchor(planId, task, anchor, side)) return;

    const repository = this.tasksService.getRepository();
    const move = async (): Promise<void> => {
      const target = await this.tasksService.allocateSortOrderBesideAnchor(
        planId,
        anchor.id,
        side,
      );
      await repository.update({ id: task.id }, { sortOrder: target });
      this.logger.debug(
        `Reconciled injected task ${task.id} beside anchor ${anchor.id} (placement '${side}', plan ${planId})`,
        InjectTaskExecutor.name,
      );
    };

    try {
      await move();
    } catch (error) {
      if (!isSortOrderUniqueViolation(error)) throw error;
      await move();
    }
  }

  /**
   * @description Whether the task already sits immediately beside the anchor on
   * the given side, with no other task between them (self excluded).
   */
  private async isBesideAnchor(
    planId: string,
    task: Task,
    anchor: Task,
    side: 'after' | 'before',
  ): Promise<boolean> {
    const repository = this.tasksService.getRepository();
    const neighbor = await repository
      .createQueryBuilder('task')
      .select(
        side === 'after' ? 'MIN(task.sortOrder)' : 'MAX(task.sortOrder)',
        'value',
      )
      .where('task.planId = :planId', { planId })
      .andWhere('task.id != :taskId', { taskId: task.id })
      .andWhere(
        side === 'after'
          ? 'task.sortOrder > :anchor'
          : 'task.sortOrder < :anchor',
        { anchor: anchor.sortOrder },
      )
      .getRawOne<{ value: string | null }>();
    const neighborValue =
      neighbor?.value != null && neighbor.value !== ''
        ? Number(neighbor.value)
        : null;

    if (side === 'after') {
      if (task.sortOrder <= anchor.sortOrder) return false;
      return neighborValue == null || neighborValue > task.sortOrder;
    }
    if (task.sortOrder >= anchor.sortOrder) return false;
    return neighborValue == null || neighborValue < task.sortOrder;
  }

  private async insertInjectedTask(
    plan: Plan,
    action: MatchedTagAction,
    payload: InjectTaskActionPayload,
  ): Promise<Task> {
    const title =
      payload.titleTemplate != null
        ? applyTemplate(payload.titleTemplate, plan, action)
        : `Run /${payload.skillSlug} (required by rule)`;
    const bodyDescription =
      payload.descriptionTemplate != null
        ? applyTemplate(payload.descriptionTemplate, plan, action)
        : `Run the /${payload.skillSlug} skill for this plan before continuing.`;
    const provenanceFooter = `---\nInjected by tag→action rule ${action.ruleId} (matched tags: [${action.matchedTags.join(', ')}]; fingerprint: ${action.ruleId}/${plan.id}).`;
    const description = `${bodyDescription}\n\n${provenanceFooter}`;

    const repository = this.tasksService.getRepository();
    const attemptInsert = async (): Promise<Task> => {
      const sortOrder = await this.resolveSortOrder(plan.id, payload);
      const entity = repository.create({
        description,
        planId: plan.id,
        sortOrder,
        status: 'PENDING',
        title,
      });
      return repository.save(entity);
    };

    try {
      return await attemptInsert();
    } catch (error) {
      if (!isSortOrderUniqueViolation(error)) throw error;
      // Concurrent writer took the slot; recompute once against fresh
      // MIN/MAX and retry.
      return attemptInsert();
    }
  }

  private async resolveSortOrder(
    planId: string,
    payload: InjectTaskActionPayload,
  ): Promise<number> {
    const { placement } = payload;
    if (placement === 'before' || placement === 'after') {
      if (payload.anchor == null) {
        throw new Error(
          `inject-task placement '${placement}' requires an anchor`,
        );
      }
      const anchorTask = await this.resolveAnchorTask(planId, payload.anchor);
      if (anchorTask == null) {
        throw new Error(
          `inject-task anchor did not resolve to a task in plan ${planId}`,
        );
      }
      // Delegate adjacency + rebalance to the canonical TasksService allocator.
      return this.tasksService.allocateSortOrderBesideAnchor(
        planId,
        anchorTask.id,
        placement,
      );
    }

    const aggregate = placement === 'first' ? 'MIN' : 'MAX';
    const value = await this.planSortOrderExtent(planId, aggregate);
    if (value == null) {
      return TASK_SORT_ORDER_GAP;
    }
    return placement === 'first'
      ? value - TASK_SORT_ORDER_GAP
      : value + TASK_SORT_ORDER_GAP;
  }

  /**
   * @description MIN/MAX(sort_order) across a plan's tasks, optionally excluding
   * one task (the injected task itself, when reconciling its own placement).
   * Returns null when the (filtered) set is empty. Shared by first-inject
   * placement and reconcile so the edge math lives in one place.
   */
  private async planSortOrderExtent(
    planId: string,
    aggregate: 'MAX' | 'MIN',
    excludeTaskId?: string,
  ): Promise<number | null> {
    const query = this.tasksService
      .getRepository()
      .createQueryBuilder('task')
      .select(`${aggregate}(task.sortOrder)`, 'value')
      .where('task.planId = :planId', { planId });
    if (excludeTaskId != null) {
      query.andWhere('task.id != :excludeTaskId', { excludeTaskId });
    }
    const result = await query.getRawOne<{ value: string | null }>();
    return result?.value != null && result.value !== ''
      ? Number(result.value)
      : null;
  }

  /**
   * @description Resolves an anchor to a task: explicit taskId first, then a
   * `/<skillSlug>` reference (title/description ILIKE), then a titleMatch
   * substring. Returns the earliest matching task by sort_order, or null.
   */
  private async resolveAnchorTask(
    planId: string,
    anchor: NonNullable<InjectTaskActionPayload['anchor']>,
  ): Promise<Task | null> {
    const repository = this.tasksService.getRepository();
    if (anchor.taskId != null) {
      return repository.findOne({
        where: { id: anchor.taskId, planId },
      });
    }

    const base = repository
      .createQueryBuilder('task')
      .where('task.plan_id = :planId', { planId })
      .orderBy('task.sort_order', 'ASC');

    if (anchor.skillSlug != null) {
      return base
        .andWhere(
          '(task.title ILIKE :reference OR task.description ILIKE :reference)',
          { reference: `%/${anchor.skillSlug}%` },
        )
        .getOne();
    }

    return base
      .andWhere('task.title ILIKE :match', { match: `%${anchor.titleMatch}%` })
      .getOne();
  }
}
