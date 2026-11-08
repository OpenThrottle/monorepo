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
  ServiceAccountsService,
  TagsService,
  TasksService,
  type TaskTag,
} from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { PlanRulesEvaluationService } from '../../../queues/plan-rules/evaluation/evaluation.service.ts';
import { PLAN_RULES_TRIGGER_KINDS } from '../../../queues/plan-rules/plan-rules.constants.ts';
import { TaskObject } from '../../tasks/task.object.ts';
import { TagsLoaders } from '../loaders/loaders.service.ts';
import { TaskTagObject } from '../tag.object.ts';
import { AddTaskTagInput, RemoveTaskTagInput } from '../tags.input.ts';
import { resolveTagCaller } from '../tags.utils.ts';

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
