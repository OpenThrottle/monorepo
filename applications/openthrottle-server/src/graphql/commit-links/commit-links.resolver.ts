/**
 * @description Resolver for CommitLink queries. Injects CommitLinksService from @openthrottle/nestjs-repositories and maps entities to CommitLinkObject.
 */
import { TaggingEnqueueService } from '../../queues/tagging/tagging-enqueue.service';

import type { CommitLink, Plan, Task } from '@openthrottle/nestjs-repositories';
import { CommitLinksService } from '@openthrottle/nestjs-repositories';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { WorkLedgerCaptureService } from '../work-ledger/work-ledger-capture.service';
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
    private readonly taggingEnqueueService: TaggingEnqueueService,
    private readonly workLedgerCapture: WorkLedgerCaptureService,
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
    deprecationReason: `Use the work ledger (workArtifactsByPlan / workArtifactsByTask / activity). commit_links is being retired (epic 3b798682).`,
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
    deprecationReason: `Use the work ledger (workArtifactsByPlan / workArtifactsByTask / activity). commit_links is being retired (epic 3b798682).`,
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
    deprecationReason: `Use workArtifactsByPlan. commit_links is being retired (epic 3b798682).`,
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
    deprecationReason: `Use workArtifactsByTask. commit_links is being retired (epic 3b798682).`,
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
    @CurrentUser('sub') actorSub?: string,
    @CurrentUser('kind') actorKind?: string,
  ): Promise<CommitLinkObject> {
    // Ledger-only write (cutover 5/6): linkCommit no longer dual-writes commit_links. The
    // work-ledger git_commit artifact (+session+subject) is the sole record; commit_links is a
    // frozen, deprecated table dropped in 6/6. The transaction keeps the session/subject/artifact
    // writes atomic. The returned CommitLinkObject is synthesized from the artifact + input so the
    // GraphQL/MCP link_commit payload is unchanged (id is now the artifact uuid).
    const manager = this.commitLinksService.getRepository().manager;
    const artifact = await manager.transaction((txn) =>
      this.workLedgerCapture.recordGitCommitLink(txn, {
        actorKind,
        actorSub,
        message: input.message ?? null,
        planId: input.planId,
        repo: input.repo,
        sha: input.sha,
        taskId: input.taskId ?? null,
      }),
    );

    // Dual-trigger refine-tagging (decision 2026-07-13): linkCommit fires immediately on its
    // landed-by-definition commit; the verifier also fires on the agent path's landed transition.
    // Same deterministic jobId dedupes. Fire-and-forget (never blocks; swallows Redis failures).
    await this.taggingEnqueueService.enqueueRefine(
      input.planId,
      input.repo,
      input.sha,
    );

    return {
      createdAt: artifact.producedAt,
      id: artifact.id,
      message: input.message ?? null,
      plan: null,
      planId: input.planId,
      repo: input.repo,
      sha: input.sha,
      task: null,
      taskId: input.taskId ?? null,
    };
  }
}
