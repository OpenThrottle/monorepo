/**
 * @description BullMQ worker for plan-rules:evaluate. One job = one full
 * evaluation pass for a plan: load plan + effective tag set (slice-2 rollup),
 * load the plan owner's enabled rules, run the pure evaluator, dispatch
 * matched actions to the {@link ActionExecutorRegistry}, and flip un-matched
 * 'applied' ledger rows to 'orphaned'. The shared fingerprint check happens
 * here (a ledger row in ANY state for (rule, plan) means no dispatch), so
 * at-least-once redelivery is safe regardless of executor behavior.
 *
 * The plan owner is resolved from plan.author (GitHub username → users row);
 * a plan whose author has no user row has no rules and is skipped. The v1
 * worker evaluates with environment=null, so environment-qualified rules only
 * match on qualified read paths (plan-context availability), not here.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import {
  PlansService,
  RuleApplicationsService,
  TagActionRulesService,
  TagsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import {
  evaluateTagActionRules,
  type TagActionRuleInput,
} from '@openthrottle/openthrottle-skills';
import { ActionExecutorRegistry } from './action-executor';
import {
  PLAN_RULES_QUEUE_NAME,
  PLAN_RULES_WORKER_CONCURRENCY,
} from './plan-rules.constants';
import type {
  PlanRulesEvaluateJob,
  PlanRulesEvaluateJobResult,
} from './plan-rules.types';

@Processor(PLAN_RULES_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: PLAN_RULES_WORKER_CONCURRENCY,
})
export class PlanRulesProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly executorRegistry: ActionExecutorRegistry,
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
    private readonly ruleApplicationsService: RuleApplicationsService,
    private readonly tagActionRulesService: TagActionRulesService,
    private readonly tagsService: TagsService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Plan rules worker started (concurrency=${PLAN_RULES_WORKER_CONCURRENCY})`,
      PlanRulesProcessor.name,
    );
  }

  onApplicationShutdown(): Promise<void> {
    return this.worker.close();
  }

  async process(
    job: PlanRulesEvaluateJob,
  ): Promise<PlanRulesEvaluateJobResult> {
    const { planId, triggerKind } = job.data;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: planId } });
    if (plan == null) {
      return {
        dispatched: 0,
        matched: 0,
        orphaned: 0,
        skipped: 'plan-missing',
      };
    }

    const owner = await this.usersService.findByGithubUsername(plan.author);
    if (owner == null) {
      this.logger.debug(
        `Plan ${planId} author "${plan.author}" has no user row; no rules to evaluate`,
        PlanRulesProcessor.name,
      );
      return { dispatched: 0, matched: 0, orphaned: 0, skipped: 'no-owner' };
    }

    const [effectiveTags, rules] = await Promise.all([
      this.tagsService.getEffectiveTagSet(planId),
      this.tagActionRulesService.listEnabledForUser(owner.id),
    ]);

    const ruleInputs: TagActionRuleInput[] = rules.map((rule) => ({
      actionPayload: rule.actionPayload,
      actionType: rule.actionType,
      enabled: rule.enabled,
      environment: rule.environment,
      id: rule.id,
      projectId: rule.projectId,
      status: rule.status,
      tagAll: rule.tagAll,
    }));

    const matched = evaluateTagActionRules(
      {
        effectiveTags: effectiveTags.map((tag) => tag.tag),
        environment: null,
        planStatus: plan.status,
        projectId: plan.projectId,
      },
      ruleInputs,
    );
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

    const fingerprints = await Promise.all(
      matched.map((action) =>
        this.ruleApplicationsService.findByRuleAndPlan(action.ruleId, planId),
      ),
    );
    const fresh = matched.filter((_, index) => fingerprints[index] == null);

    const dispatchable = fresh.flatMap((action) => {
      const executor = this.executorRegistry.get(action.actionType);
      const rule = rulesById.get(action.ruleId);
      if (executor == null || rule == null) {
        this.logger.debug(
          `No executor registered for "${action.actionType}" (rule ${action.ruleId}, plan ${planId}); skipping without a ledger row`,
          PlanRulesProcessor.name,
        );
        return [];
      }
      return [{ action, executor, rule }];
    });

    await Promise.all(
      dispatchable.map(({ action, executor, rule }) =>
        executor.execute({ action, ownerUserId: owner.id, plan, rule }),
      ),
    );
    const dispatched = dispatchable.length;

    const orphaned =
      await this.ruleApplicationsService.orphanUnmatchedApplications(
        planId,
        matched.map((action) => action.ruleId),
      );
    if (orphaned > 0) {
      this.logger.info(
        `Orphaned ${orphaned} rule application(s) on plan ${planId} (trigger: ${triggerKind})`,
        PlanRulesProcessor.name,
      );
    }

    return { dispatched, matched: matched.length, orphaned, skipped: null };
  }
}
