/**
 * @description Resolver for CommitLink queries. Injects CommitLinksService from @openthrottle/nestjs-repositories and maps entities to CommitLinkObject.
 */

import type { CommitLink, Plan, Task } from '@openthrottle/nestjs-repositories';
import { CommitLinksService } from '@openthrottle/nestjs-repositories';
import {
  Args,
  Int,
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
import { CommitLinksLoaders } from './commit-links-loaders';

/** Default cap for the unpaginated commitLinks() list query so it never full-table-scans. */
const DEFAULT_COMMIT_LINKS_LIMIT = 100;
/** Hard ceiling for commitLinks() even when an explicit limit is supplied. */
const MAX_COMMIT_LINKS_LIMIT = 500;

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => CommitLinkObject)
export class CommitLinksResolver {
  constructor(
    private readonly commitLinksService: CommitLinksService,
    private readonly loaders: CommitLinksLoaders,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(@Parent() parent: CommitLinkObject): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  async task(@Parent() parent: CommitLinkObject): Promise<Task | null> {
    if (!parent.taskId) return null;

    return this.loaders.taskLoader.load(parent.taskId);
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
    description: `List commit links, ordered by createdAt descending. Capped at ${DEFAULT_COMMIT_LINKS_LIMIT} by default (max ${MAX_COMMIT_LINKS_LIMIT}); pass limit to override. Use commitLinksByPlanId/commitLinksByTaskId for scoped lists.`,
  })
  async commitLinks(
    @Args('limit', { nullable: true, type: () => Int })
    limit?: number | null,
  ): Promise<CommitLink[]> {
    const effectiveLimit = Math.min(
      Math.max(1, limit ?? DEFAULT_COMMIT_LINKS_LIMIT),
      MAX_COMMIT_LINKS_LIMIT,
    );
    const entities = await this.commitLinksService.getRepository().find({
      order: { createdAt: 'DESC' },
      take: effectiveLimit,
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
