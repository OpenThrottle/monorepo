import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  PlansService,
  type ProjectTag,
  ServiceAccountsService,
  TagsService,
} from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { PlanRulesEvaluationService } from '../../../queues/plan-rules/evaluation/evaluation.service.ts';
import { PLAN_RULES_TRIGGER_KINDS } from '../../../queues/plan-rules/plan-rules.constants.ts';
import { ProjectObject } from '../../projects/project.object.ts';
import { TagsLoaders } from '../loaders/loaders.service.ts';
import { ProjectTagObject } from '../tag.object.ts';
import { AddProjectTagInput, RemoveProjectTagInput } from '../tags.input.ts';
import { resolveTagCaller } from '../tags.utils.ts';

@Resolver(() => ProjectObject)
@UseGuards(GqlPermissionsGuard)
export class ProjectTagsResolver {
  constructor(
    private readonly loaders: TagsLoaders,
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
    private readonly planRulesEvaluationService: PlanRulesEvaluationService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly tagsService: TagsService,
  ) {}

  /**
   * @description Project tags feed the effective tag set of every plan in the
   * project, so a project-tag change re-runs a full evaluation pass for each of
   * those plans (fire-and-forget; the ledger makes redelivery safe).
   */
  private async enqueueProjectPlansEvaluation(
    projectId: string,
  ): Promise<void> {
    const plans = await this.plansService
      .getRepository()
      .find({ select: { id: true }, where: { projectId } });
    this.logger.debug(
      `Project ${projectId} tag change → enqueuing plan-rules evaluation for ${plans.length} plan(s)`,
      ProjectTagsResolver.name,
    );
    await Promise.all(
      plans.map((plan) =>
        this.planRulesEvaluationService.enqueueEvaluation(
          plan.id,
          PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
        ),
      ),
    );
  }

  @ResolveField(() => [ProjectTagObject], {
    description: `Tags attached to this project, alphabetically by tag.`,
  })
  async tags(@Parent() parent: ProjectObject): Promise<ProjectTag[]> {
    return this.loaders.projectTagsByProjectIdLoader.load(parent.id);
  }

  @Mutation(() => ProjectTagObject, {
    description: `Attach a tag to a project. The tag must be in the caller's skill-tag vocabulary; source is derived from the caller identity. Multiple tags per project are allowed (no phase-tag limit). Re-runs plan-rules evaluation for every plan in the project.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async addProjectTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => AddProjectTagInput })
    input: AddProjectTagInput,
  ): Promise<ProjectTag> {
    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const tag = await this.tagsService.addProjectTag(
      caller,
      input.projectId,
      input.tag,
    );
    await this.enqueueProjectPlansEvaluation(input.projectId);
    return tag;
  }

  @Mutation(() => Boolean, {
    description: `Remove a tag from a project under the provenance ladder (an agent cannot remove a human row; server-llm removes only its own). Returns false when the tag was not present. Re-runs plan-rules evaluation for every plan in the project when a tag was removed.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async removeProjectTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => RemoveProjectTagInput })
    input: RemoveProjectTagInput,
  ): Promise<boolean> {
    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const removed = await this.tagsService.removeProjectTag(
      caller,
      input.projectId,
      input.tag,
    );
    if (removed) {
      await this.enqueueProjectPlansEvaluation(input.projectId);
    }
    return removed;
  }
}
