import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  type PlanTag,
  ServiceAccountsService,
  TagsService,
} from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { PlanRulesEvaluationService } from '../../../queues/plan-rules/evaluation/evaluation.service.ts';
import { PLAN_RULES_TRIGGER_KINDS } from '../../../queues/plan-rules/plan-rules.constants.ts';
import { PlanObject } from '../../plans/plan.object.ts';
import { TagsLoaders } from '../loaders/loaders.service.ts';
import { PlanTagObject } from '../tag.object.ts';
import { AddPlanTagInput, RemovePlanTagInput } from '../tags.input.ts';
import { resolveTagCaller } from '../tags.utils.ts';

@Resolver(() => PlanObject)
@UseGuards(GqlPermissionsGuard)
export class PlanTagsResolver {
  constructor(
    private readonly loaders: TagsLoaders,
    private readonly planRulesEvaluationService: PlanRulesEvaluationService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly tagsService: TagsService,
  ) {}

  @ResolveField(() => [PlanTagObject], {
    description: `Tags attached to this plan, alphabetically by tag.`,
  })
  async tags(@Parent() parent: PlanObject): Promise<PlanTag[]> {
    return this.loaders.planTagsByPlanIdLoader.load(parent.id);
  }

  @Mutation(() => PlanTagObject, {
    description: `Attach a tag to a plan. The tag must be in the caller's skill-tag vocabulary; source is derived from the caller identity. At most one phase tag per plan (equal-or-lower provenance is replaced, higher rejects).`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async addPlanTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => AddPlanTagInput }) input: AddPlanTagInput,
  ): Promise<PlanTag> {
    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const tag = await this.tagsService.addPlanTag(
      caller,
      input.planId,
      input.tag,
    );
    await this.planRulesEvaluationService.enqueueEvaluation(
      input.planId,
      PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
    );
    return tag;
  }

  @Mutation(() => Boolean, {
    description: `Remove a tag from a plan under the provenance ladder (an agent cannot remove a human row; server-llm removes only its own). Returns false when the tag was not present.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async removePlanTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => RemovePlanTagInput })
    input: RemovePlanTagInput,
  ): Promise<boolean> {
    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const removed = await this.tagsService.removePlanTag(
      caller,
      input.planId,
      input.tag,
    );
    if (removed) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        input.planId,
        PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
      );
    }
    return removed;
  }
}
