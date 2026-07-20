/**
 * @description The 'promote-task-to-plan' ActionExecutor. Tagging becomes an
 * automation trigger over the SAME {@link TaskPromotionService} the explicit
 * promoteTaskToPlan mutation uses — never a second implementation.
 *
 * The plan-rules worker matches against the plan's effective tag set and runs
 * this only for first-time (rule, plan) pairs (the shared fingerprint pre-check).
 * Because promotion is task-scoped but the evaluator is plan-scoped, the executor
 * resolves the concrete targets here: every not-yet-promoted task in the plan
 * carrying one of the rule's matched tags. Each is promoted via the idempotent
 * service; the ledger records 'applied' (with the promoted task ids) or
 * 'flagged' {reason:'no-eligible-task'} when nothing matched.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  RULE_APPLICATION_STATES,
  RuleApplicationsService,
  TagsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { TAG_ACTION_TYPES } from '@openthrottle/openthrottle-skills';
import { TaskPromotionService } from '../task-promotion/task-promotion.service';
import { PROMOTED_TAG } from '../task-promotion/task-promotion.constants';
import {
  ActionExecutorRegistry,
  type ActionExecutor,
  type ActionExecutorContext,
} from './action-executor';

@Injectable()
export class PromoteTaskToPlanExecutor implements ActionExecutor, OnModuleInit {
  readonly actionType = TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN;

  constructor(
    private readonly executorRegistry: ActionExecutorRegistry,
    private readonly logger: LoggerService,
    private readonly ruleApplicationsService: RuleApplicationsService,
    private readonly tagsService: TagsService,
    private readonly taskPromotionService: TaskPromotionService,
    private readonly tasksService: TasksService,
  ) {}

  onModuleInit(): void {
    this.executorRegistry.register(this);
  }

  async execute(context: ActionExecutorContext): Promise<void> {
    const { action, ownerUserId, plan, rule } = context;

    const candidateTaskIds = await this.resolveCandidateTaskIds(
      plan.id,
      action.matchedTags,
    );

    if (candidateTaskIds.length === 0) {
      await this.ruleApplicationsService.record({
        details: {
          matchedTags: action.matchedTags,
          reason: 'no-eligible-task',
        },
        planId: plan.id,
        ruleId: rule.id,
        state: RULE_APPLICATION_STATES.FLAGGED,
      });
      return;
    }

    const outcomes = await Promise.all(
      candidateTaskIds.map((taskId) =>
        this.taskPromotionService
          .promote({
            actorServiceAccountId: null,
            actorUserId: ownerUserId,
            taskId,
          })
          .then((outcome) => ({ outcome, taskId })),
      ),
    );
    const promotedTaskIds = outcomes
      .filter(({ outcome }) => outcome.newPlanId != null)
      .map(({ taskId }) => taskId);

    this.logger.info(
      `promote-task-to-plan rule ${rule.id} promoted ${promotedTaskIds.length}/${candidateTaskIds.length} task(s) on plan ${plan.id}`,
      PromoteTaskToPlanExecutor.name,
    );

    await this.ruleApplicationsService.record({
      details: {
        matchedTags: action.matchedTags,
        promotedTaskIds,
      },
      planId: plan.id,
      ruleId: rule.id,
      state: RULE_APPLICATION_STATES.APPLIED,
    });
  }

  /**
   * @description Tasks in the plan carrying one of the matched tags that are not
   * already promoted (SKIPPED + `promoted` tag). Returns distinct task ids.
   */
  private async resolveCandidateTaskIds(
    planId: string,
    matchedTags: readonly string[],
  ): Promise<string[]> {
    if (matchedTags.length === 0) return [];

    const taggedTaskIds = await this.tagsService
      .getTaskTagsRepository()
      .createQueryBuilder('taskTag')
      .innerJoin('tasks', 'task', 'task.id = taskTag.task_id')
      .where('task.plan_id = :planId', { planId })
      .andWhere('taskTag.tag IN (:...tags)', { tags: [...matchedTags] })
      .select('DISTINCT taskTag.task_id', 'taskId')
      .getRawMany<{ taskId: string }>();

    const checked = await Promise.all(
      taggedTaskIds.map(({ taskId }) =>
        this.isAlreadyPromoted(taskId).then((alreadyPromoted) => ({
          alreadyPromoted,
          taskId,
        })),
      ),
    );
    return checked
      .filter(({ alreadyPromoted }) => !alreadyPromoted)
      .map(({ taskId }) => taskId);
  }

  /** A task already SKIPPED with the `promoted` tag is skipped (idempotency). */
  private async isAlreadyPromoted(taskId: string): Promise<boolean> {
    const task = await this.tasksService
      .getRepository()
      .findOne({ where: { id: taskId } });
    if (task == null || task.status !== 'SKIPPED') {
      return false;
    }
    const promotedTag = await this.tagsService
      .getTaskTagsRepository()
      .findOne({ where: { tag: PROMOTED_TAG, taskId } });
    return promotedTag != null;
  }
}
