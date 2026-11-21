import { BadRequestException, Injectable } from '@nestjs/common';
import {
  type Plan,
  PlansRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  evaluateTagActionRules,
  explainTagActionRuleMatch,
  rankMatchedTagActions,
  scoreTagActionSpecificity,
  SKILL_AVAILABILITY_ENVIRONMENTS,
  type TagActionEvaluationContext,
  type TagActionRuleInput,
} from '@openthrottle/openthrottle-skills';

import { TagsService } from '../tags/tags.service.ts';
import {
  TAG_ACTION_RULE_PREVIEW_NON_MATCH_SAMPLE_SIZE,
  TAG_ACTION_RULE_PREVIEW_PLAN_CAP,
} from './tag-action-rule-preview.constants.ts';
import type {
  TagActionRulePreviewNonMatch,
  TagActionRulePreviewPlan,
  TagActionRulePreviewResult,
  TagActionRulePreviewRule,
} from './tag-action-rule-preview.types.ts';

const PREVIEW_RULE_ID = 'preview';

const isEnvironment = (value: string): boolean => {
  return SKILL_AVAILABILITY_ENVIRONMENTS.some((known) => known === value);
};

/**
 * @description The "why didn't my rule fire" read: runs the real pure evaluator
 * (`evaluateTagActionRules`, ranked by `rankMatchedTagActions`) over the caller's plans and
 * their effective tag sets, and explains the non-matches per condition. Strictly read-only: it
 * writes no ledger row and dispatches no executor (none is even injected). Plans are the ones
 * whose author is the caller's GitHub username, the same ownership the plan-rules worker uses.
 * The rule is always evaluated as enabled: the preview answers "what would this match", not
 * "is it switched on".
 */
@Injectable()
export class TagActionRulePreviewService {
  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly tagsService: TagsService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async preview(
    userId: string,
    rule: TagActionRulePreviewRule,
    environment: string | null,
  ): Promise<TagActionRulePreviewResult> {
    if (environment != null && !isEnvironment(environment)) {
      throw new BadRequestException(
        `Unknown environment "${environment}": expected one of ${SKILL_AVAILABILITY_ENVIRONMENTS.join(', ')}.`,
      );
    }

    const ruleInput: TagActionRuleInput = {
      actionPayload: {},
      actionType: rule.actionType,
      createdAt: new Date(0),
      enabled: true,
      environment: rule.environment,
      id: PREVIEW_RULE_ID,
      projectId: rule.projectId,
      repositoryId: rule.repositoryId,
      status: rule.status,
      tagAll: rule.tagAll,
    };
    const specificity = scoreTagActionSpecificity(ruleInput);

    const owner = await this.usersRepository.findOne({
      where: { id: userId },
    });
    // One past the cap tells a full set from a truncated one without a count query.
    const fetched = await this.listCandidatePlans(owner?.githubUsername);
    const truncated = fetched.length > TAG_ACTION_RULE_PREVIEW_PLAN_CAP;
    const plans = fetched.slice(0, TAG_ACTION_RULE_PREVIEW_PLAN_CAP);

    const tagRows = await this.tagsService.getEffectiveTagNamesForPlans(
      plans.map((plan) => plan.id),
    );

    const matched: TagActionRulePreviewPlan[] = [];
    const nonMatching: TagActionRulePreviewNonMatch[] = [];

    for (const plan of plans) {
      const context: TagActionEvaluationContext = {
        effectiveTags: tagRows.get(plan.id) ?? [],
        environment,
        planStatus: plan.status,
        projectId: plan.projectId,
        repositoryId: plan.repositoryId,
      };
      const summary: TagActionRulePreviewPlan = {
        id: plan.id,
        repositoryId: plan.repositoryId,
        status: plan.status,
        title: plan.title,
      };

      if (
        rankMatchedTagActions(evaluateTagActionRules(context, [ruleInput]))
          .length > 0
      ) {
        matched.push(summary);
      } else if (
        nonMatching.length < TAG_ACTION_RULE_PREVIEW_NON_MATCH_SAMPLE_SIZE
      ) {
        nonMatching.push({
          ...summary,
          explanation: explainTagActionRuleMatch(context, ruleInput),
        });
      }
    }

    return {
      cap: TAG_ACTION_RULE_PREVIEW_PLAN_CAP,
      environment,
      evaluated: plans.length,
      matched,
      matchedCount: matched.length,
      nonMatching,
      specificity,
      truncated,
    };
  }

  private async listCandidatePlans(
    githubUsername: string | undefined,
  ): Promise<Plan[]> {
    if (githubUsername == null) return [];
    return this.plansRepository.listRecentForAuthor(
      githubUsername,
      TAG_ACTION_RULE_PREVIEW_PLAN_CAP + 1,
    );
  }
}
