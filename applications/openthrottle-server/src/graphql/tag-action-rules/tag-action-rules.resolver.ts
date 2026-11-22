/**
 * @description GraphQL CRUD for tag→action rules + the rule_applications
 * ledger read. Rules are user-owned: v1 requires a USER principal (service
 * accounts get an explanatory error — there is no sensible rule owner for a
 * machine identity yet). Payloads are Zod-validated per action type in
 * TagActionRulesService. Mirrored by the openthrottle-mcp
 * upsert/delete/list_tag_action_rule(s), preview_tag_action_rule and
 * list_rule_applications tools.
 */

import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type {
  RuleApplication,
  TagActionRule,
} from '@openthrottle/nestjs-repositories-server';
import {
  RuleApplicationsRepository,
  TagActionRulesRepository,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { TagActionRulePreviewService } from '../../services/tag-action-rule-preview/tag-action-rule-preview.service.ts';
import { TagActionRulesService } from '../../services/tag-action-rules/tag-action-rules.service.ts';
import { assertTagActionType } from '../../services/tag-action-rules/tag-action-rules.utils.ts';
import {
  RuleApplicationObject,
  TagActionRuleObject,
} from './tag-action-rule.object.ts';
import { TagActionRulePreviewObject } from './tag-action-rule-preview.object.ts';
import {
  DeleteTagActionRuleInput,
  UpsertTagActionRuleInput,
} from './tag-action-rules.input.ts';

const requireUserPrincipal = (principal: AuthPrincipal): string => {
  if (principal.kind !== AUTH_PRINCIPAL_KIND_USER) {
    throw new BadRequestException(
      `Tag→action rule CRUD requires a user identity in v1: rules are user-owned and a service-account caller has no rule owner to write against.`,
    );
  }
  return principal.sub;
};

const toRuleObject = (rule: TagActionRule): TagActionRuleObject => {
  return {
    actionPayloadJson: JSON.stringify(rule.actionPayload),
    actionType: rule.actionType,
    createdAt: rule.createdAt,
    enabled: rule.enabled,
    environment: rule.environment,
    id: rule.id,
    projectId: rule.projectId,
    repositoryId: rule.repositoryId,
    status: rule.status,
    tagAll: rule.tagAll,
    title: rule.title,
    updatedAt: rule.updatedAt,
    userId: rule.userId,
  };
};

const toApplicationObject = (
  application: RuleApplication,
): RuleApplicationObject => {
  return {
    createdAt: application.createdAt,
    detailsJson:
      application.details == null ? null : JSON.stringify(application.details),
    id: application.id,
    planId: application.planId,
    planTitle: application.plan?.title ?? null,
    ruleId: application.ruleId,
    state: application.state,
    taskId: application.taskId,
    updatedAt: application.updatedAt,
  };
};

@Resolver(() => TagActionRuleObject)
@UseGuards(GqlPermissionsGuard)
export class TagActionRulesResolver {
  constructor(
    private readonly ruleApplicationsRepository: RuleApplicationsRepository,
    private readonly tagActionRulePreviewService: TagActionRulePreviewService,
    private readonly tagActionRulesRepository: TagActionRulesRepository,
    private readonly tagActionRulesService: TagActionRulesService,
  ) {}

  @Query(() => [TagActionRuleObject], {
    description: `The authenticated user's tag→action rules, oldest first.`,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  async tagActionRules(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<TagActionRuleObject[]> {
    const userId = requireUserPrincipal(principal);
    const rules = await this.tagActionRulesRepository.listForUser(userId);
    return rules.map(toRuleObject);
  }

  @Query(() => TagActionRuleObject, {
    description: `A single tag→action rule by id, scoped to the authenticated user; null when absent or owned by someone else.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  async tagActionRule(
    @CurrentUser() principal: AuthPrincipal,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TagActionRuleObject | null> {
    const userId = requireUserPrincipal(principal);
    const rule = await this.tagActionRulesRepository.findForUser(userId, id);
    return rule == null ? null : toRuleObject(rule);
  }

  @Query(() => [RuleApplicationObject], {
    description: `The apply-once ledger rows for a plan, oldest first. Surfaces flagged/orphaned applications.`,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  async ruleApplications(
    @Args('planId', { type: () => ID }) planId: string,
  ): Promise<RuleApplicationObject[]> {
    const applications =
      await this.ruleApplicationsRepository.listForPlan(planId);
    return applications.map(toApplicationObject);
  }

  @Query(() => [RuleApplicationObject], {
    description: `The apply-once ledger rows of one of the caller's own rules across plans, newest first. Empty when the rule is absent, deleted or owned by someone else.`,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  async ruleApplicationsForRule(
    @CurrentUser() principal: AuthPrincipal,
    @Args('ruleId', { type: () => ID }) ruleId: string,
  ): Promise<RuleApplicationObject[]> {
    const userId = requireUserPrincipal(principal);
    const rule = await this.tagActionRulesRepository.findForUser(
      userId,
      ruleId,
    );
    if (rule == null) return [];
    const applications =
      await this.ruleApplicationsRepository.listForRule(ruleId);
    return applications.map(toApplicationObject);
  }

  @Query(() => TagActionRulePreviewObject, {
    description: `Dry run: which of the caller's plans a rule would match, and why the rest do not, by the same evaluator the worker uses. Read-only: writes no ledger row and dispatches nothing. Only the match fields (projectId, repositoryId, status, environment, tagAll, actionType) are read, so a half-written actionPayloadJson never blocks it; the rule is evaluated as enabled. \`environment\` is the environment to evaluate plans in (ci | interactive | ralph); omit it for none — a pass triggered by a developer-app edit or a background job — so an environment-qualified rule then matches nothing. At most the newest 500 plans are evaluated; truncated says so.`,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  async previewTagActionRule(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => UpsertTagActionRuleInput })
    input: UpsertTagActionRuleInput,
    @Args('environment', { nullable: true, type: () => String })
    environment?: string | null,
  ): Promise<TagActionRulePreviewObject> {
    const userId = requireUserPrincipal(principal);
    const actionType = assertTagActionType(input.actionType);

    const preview = await this.tagActionRulePreviewService.preview(
      userId,
      {
        actionType,
        environment: input.environment ?? null,
        projectId: input.projectId ?? null,
        repositoryId: input.repositoryId ?? null,
        status: input.status ?? null,
        tagAll: input.tagAll ?? [],
      },
      environment ?? null,
    );

    return {
      ...preview,
      matched: [...preview.matched],
      nonMatching: preview.nonMatching.map(({ explanation, ...plan }) => {
        return {
          ...plan,
          conditions: [...explanation.conditions],
          failedOnlyOnEnvironment: explanation.failedOnlyOnEnvironment,
          missingTags: [...explanation.missingTags],
        };
      }),
    };
  }

  @Mutation(() => TagActionRuleObject, {
    description: `Create or update a tag→action rule. The JSON payload is validated against the action type's schema.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async upsertTagActionRule(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => UpsertTagActionRuleInput })
    input: UpsertTagActionRuleInput,
  ): Promise<TagActionRuleObject> {
    const userId = requireUserPrincipal(principal);

    let actionPayload: unknown;
    try {
      actionPayload = JSON.parse(input.actionPayloadJson);
    } catch {
      throw new BadRequestException(
        `actionPayloadJson is not valid JSON: ${input.actionPayloadJson}`,
      );
    }

    const rule = await this.tagActionRulesService.upsertRule(userId, {
      actionPayload,
      actionType: input.actionType,
      enabled: input.enabled ?? true,
      environment: input.environment ?? null,
      id: input.id ?? null,
      projectId: input.projectId ?? null,
      repositoryId: input.repositoryId ?? null,
      status: input.status ?? null,
      tagAll: input.tagAll ?? [],
      title: input.title,
    });
    return toRuleObject(rule);
  }

  @Mutation(() => Boolean, {
    description: `Soft delete a tag→action rule: it stops evaluating, and its ledger rows are kept but no longer listed by ruleApplications. Returns false when absent.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async deleteTagActionRule(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => DeleteTagActionRuleInput })
    input: DeleteTagActionRuleInput,
  ): Promise<boolean> {
    const userId = requireUserPrincipal(principal);
    return this.tagActionRulesRepository.removeForUser(userId, input.id);
  }
}
