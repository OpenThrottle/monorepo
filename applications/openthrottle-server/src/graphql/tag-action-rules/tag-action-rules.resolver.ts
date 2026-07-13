/**
 * @description GraphQL CRUD for tag→action rules + the rule_applications
 * ledger read. Rules are user-owned: v1 requires a USER principal (service
 * accounts get an explanatory error — there is no sensible rule owner for a
 * machine identity yet). Payloads are Zod-validated per action type in the
 * repository service. Mirrored by the openthrottle-mcp
 * upsert/delete/list_tag_action_rule(s) and list_rule_applications tools.
 */

import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  type RuleApplication,
  RuleApplicationsService,
  type TagActionRule,
  TagActionRulesService,
} from '@openthrottle/nestjs-repositories';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  DeleteTagActionRuleInput,
  UpsertTagActionRuleInput,
} from './tag-action-rules.input';
import {
  RuleApplicationObject,
  TagActionRuleObject,
} from './tag-action-rule.object';

const requireUserPrincipal = (principal: AuthPrincipal): string => {
  if (principal.kind !== AUTH_PRINCIPAL_KIND_USER) {
    throw new BadRequestException(
      `Tag→action rule CRUD requires a user identity in v1: rules are user-owned and a service-account caller has no rule owner to write against.`,
    );
  }
  return principal.sub;
};

const toRuleObject = (rule: TagActionRule): TagActionRuleObject => ({
  actionPayloadJson: JSON.stringify(rule.actionPayload),
  actionType: rule.actionType,
  createdAt: rule.createdAt,
  enabled: rule.enabled,
  environment: rule.environment,
  id: rule.id,
  projectId: rule.projectId,
  status: rule.status,
  tagAll: rule.tagAll,
  updatedAt: rule.updatedAt,
  userId: rule.userId,
});

const toApplicationObject = (
  application: RuleApplication,
): RuleApplicationObject => ({
  createdAt: application.createdAt,
  detailsJson:
    application.details == null ? null : JSON.stringify(application.details),
  id: application.id,
  planId: application.planId,
  ruleId: application.ruleId,
  state: application.state,
  taskId: application.taskId,
  updatedAt: application.updatedAt,
});

@Resolver(() => TagActionRuleObject)
@UseGuards(GqlPermissionsGuard)
export class TagActionRulesResolver {
  constructor(
    private readonly ruleApplicationsService: RuleApplicationsService,
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
    const rules = await this.tagActionRulesService.listForUser(userId);
    return rules.map(toRuleObject);
  }

  @Query(() => [RuleApplicationObject], {
    description: `The apply-once ledger rows for a plan, oldest first. Surfaces flagged/orphaned applications.`,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  async ruleApplications(
    @Args('planId', { type: () => String }) planId: string,
  ): Promise<RuleApplicationObject[]> {
    const applications = await this.ruleApplicationsService.listForPlan(planId);
    return applications.map(toApplicationObject);
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
      status: input.status ?? null,
      tagAll: input.tagAll ?? [],
    });
    return toRuleObject(rule);
  }

  @Mutation(() => Boolean, {
    description: `Delete a tag→action rule (its ledger rows CASCADE). Returns false when absent.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async deleteTagActionRule(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => DeleteTagActionRuleInput })
    input: DeleteTagActionRuleInput,
  ): Promise<boolean> {
    const userId = requireUserPrincipal(principal);
    return this.tagActionRulesService.deleteRule(userId, input.id);
  }
}
