/**
 * @description GraphQL resolver for plan/task tags: add/remove mutations plus
 * loader-based `tags` fields on Plan and Task. The tag `source` is derived from
 * the request principal (user JWT → human; service account → agent; the
 * tagging service account → server-llm) and never accepted from client input.
 * Mirrored by the openthrottle-mcp add/remove_plan_tag and add/remove_task_tag
 * tools. See docs/monorepo/plan-task-tags-rules-design.md.
 */

import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  type PlanTag,
  PlansService,
  type ProjectTag,
  ServiceAccountsService,
  type TagCaller,
  TagsService,
  TasksService,
  type TaskTag,
} from '@openthrottle/nestjs-repositories';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { PlanRulesEvaluationService } from '../../queues/plan-rules/plan-rules-evaluation.service';
import { PLAN_RULES_TRIGGER_KINDS } from '../../queues/plan-rules/plan-rules.types';
import { PlanObject } from '../plans/plan.object';
import { ProjectObject } from '../projects/project.object';
import { TaskObject } from '../tasks/task.object';
import {
  AddPlanTagInput,
  AddProjectTagInput,
  AddTaskTagInput,
  RemovePlanTagInput,
  RemoveProjectTagInput,
  RemoveTaskTagInput,
} from './tags.input';
import { PlanTagObject, ProjectTagObject, TaskTagObject } from './tag.object';
import { TagsLoaders } from './tags-loaders';

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

@Resolver(() => TaskObject)
@UseGuards(GqlPermissionsGuard)
export class TaskTagsResolver {
  constructor(
    private readonly loaders: TagsLoaders,
    private readonly planRulesEvaluationService: PlanRulesEvaluationService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly tagsService: TagsService,
    private readonly tasksService: TasksService,
  ) {}

  private async enqueueTaskPlanEvaluation(taskId: string): Promise<void> {
    const task = await this.tasksService
      .getRepository()
      .findOne({ where: { id: taskId } });
    if (task?.planId != null) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        task.planId,
        PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
      );
    }
  }

  @ResolveField(() => [TaskTagObject], {
    description: `Tags attached to this task, alphabetically by tag.`,
  })
  async tags(@Parent() parent: TaskObject): Promise<TaskTag[]> {
    return this.loaders.taskTagsByTaskIdLoader.load(parent.id);
  }

  @Mutation(() => TaskTagObject, {
    description: `Attach a tag to a task. The tag must be in the caller's skill-tag vocabulary; source is derived from the caller identity.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async addTaskTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => AddTaskTagInput }) input: AddTaskTagInput,
  ): Promise<TaskTag> {
    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const tag = await this.tagsService.addTaskTag(
      caller,
      input.taskId,
      input.tag,
    );
    await this.enqueueTaskPlanEvaluation(input.taskId);
    return tag;
  }

  @Mutation(() => Boolean, {
    description: `Remove a tag from a task under the provenance ladder. Returns false when the tag was not present.`,
  })
  @Permissions(PERMISSIONS.PLANS_WRITE)
  async removeTaskTag(
    @CurrentUser() principal: AuthPrincipal,
    @Args('input', { type: () => RemoveTaskTagInput })
    input: RemoveTaskTagInput,
  ): Promise<boolean> {
    const caller = await resolveTagCaller(
      principal,
      this.serviceAccountsService,
    );
    const removed = await this.tagsService.removeTaskTag(
      caller,
      input.taskId,
      input.tag,
    );
    if (removed) {
      await this.enqueueTaskPlanEvaluation(input.taskId);
    }
    return removed;
  }
}

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

/**
 * @description Builds the {@link TagCaller} from the request principal: user
 * JWTs map directly; service-account principals resolve their account name so
 * the tags service can classify the tagging account as server-llm.
 */
export const resolveTagCaller = async (
  principal: AuthPrincipal,
  serviceAccountsService: ServiceAccountsService,
): Promise<TagCaller> => {
  if (principal.kind === AUTH_PRINCIPAL_KIND_USER) {
    return { principalKind: 'user', subjectId: principal.sub };
  }

  const account = await serviceAccountsService.findById(principal.sub);
  return {
    principalKind: 'service_account',
    serviceAccountName: account?.name,
    subjectId: principal.sub,
  };
};
