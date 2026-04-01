/**
 * @description Resolver for CommitLink queries. Injects CommitLinksService from @openthrottle/nestjs-repositories and maps entities to CommitLinkObject.
 */

import type { CommitLink, Plan, Task } from '@openthrottle/nestjs-repositories';
import {
  CommitLinksService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { TaskObject } from '../tasks/task.object';
import {
  CommitLinksByPlanIdInput,
  CommitLinksByTaskIdInput,
  GetCommitLinkInput,
  LinkCommitInput,
} from './commit-link.input';
import { CommitLinkObject } from './commit-link.object';

@Resolver(() => CommitLinkObject)
export class CommitLinksResolver {
  constructor(
    private readonly commitLinksService: CommitLinksService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(@Parent() parent: CommitLinkObject): Promise<Plan | null> {
    if (!parent.planId) return null;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: parent.planId } });

    return plan;
  }

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  async task(@Parent() parent: CommitLinkObject): Promise<Task | null> {
    if (!parent.taskId) return null;

    const task = await this.tasksService
      .getRepository()
      .findOne({ where: { id: parent.taskId } });

    return task;
  }

  @Query(() => CommitLinkObject, {
    description: `Get a commit link by ID`,
    nullable: true,
  })
  async commitLink(
    @Args('input', { type: () => GetCommitLinkInput })
    input: GetCommitLinkInput,
  ): Promise<CommitLink | null> {
    const entity = await this.commitLinksService
      .getRepository()
      .findOne({ where: { id: input.id } });

    return entity;
  }

  @Query(() => [CommitLinkObject], {
    description: `List all commit links, ordered by createdAt descending`,
  })
  async commitLinks(): Promise<CommitLink[]> {
    const entities = await this.commitLinksService.getRepository().find({
      order: { createdAt: 'DESC' },
    });

    return entities;
  }

  @Query(() => [CommitLinkObject], {
    description: `List commit links for a plan (plan-level and task-level), ordered by createdAt descending`,
  })
  async commitLinksByPlanId(
    @Args('input', { type: () => CommitLinksByPlanIdInput })
    input: CommitLinksByPlanIdInput,
  ): Promise<CommitLink[]> {
    const entities = await this.commitLinksService.getRepository().find({
      order: { createdAt: 'DESC' },
      where: { planId: input.planId },
    });

    return entities;
  }

  @Query(() => [CommitLinkObject], {
    description: `List commit links for a task, ordered by createdAt descending`,
  })
  async commitLinksByTaskId(
    @Args('input', { type: () => CommitLinksByTaskIdInput })
    input: CommitLinksByTaskIdInput,
  ): Promise<CommitLink[]> {
    const entities = await this.commitLinksService.getRepository().find({
      order: { createdAt: 'DESC' },
      where: { taskId: input.taskId },
    });

    return entities;
  }

  @Mutation(() => CommitLinkObject, {
    description: `Associate a git commit with a plan (and optionally a task). Use after PR merge with squash SHA.`,
  })
  async linkCommit(
    @Args('input', { type: () => LinkCommitInput })
    input: LinkCommitInput,
  ): Promise<CommitLink> {
    const entity = this.commitLinksService.getRepository().create({
      message: input.message ?? null,
      planId: input.planId,
      repo: input.repo,
      sha: input.sha,
      taskId: input.taskId ?? null,
    });

    return this.commitLinksService.getRepository().save(entity);
  }
}
