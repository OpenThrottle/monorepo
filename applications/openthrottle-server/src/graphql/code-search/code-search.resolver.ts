/**
 * @description GraphQL resolver for code semantic search over a registered repository. Resolves
 * repositoryId → filesystemPath server-side (user-scoped; never trusts a client path) — for search,
 * also from a caller's workspacePath; search and status run as the human a service account acts
 * for — runs search via @openthrottle/nestjs-vector-search, enqueues async full re-index on the
 * code-index BullMQ queue, and derives index status. Backs the /ide Semantic tab.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';
import { Queue } from 'bullmq';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import {
  CODE_INDEX_QUEUE_NAME,
  INDEX_CODE_REPOSITORY_JOB_NAME,
} from '../../queues/code-index/code-index.constants.ts';
import type {
  CodeIndexJobPayload,
  CodeIndexJobResult,
} from '../../queues/code-index/code-index.types.ts';
import { CheckoutPathResolutionService } from '../../services/checkout-path-resolution/checkout-path-resolution.service.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { WorkspaceLocalRepositoriesService } from '../../services/workspace-local-repositories/workspace-local-repositories.service.ts';
import { CODE_INDEX_STATUS } from './code-search.constants.ts';
import { CodeSemanticSearchInput } from './code-search.input.ts';
import {
  CodeIndexStatusObject,
  CodeSemanticSearchResult,
  IndexCodeRepositoryResult,
} from './code-search.object.ts';
import type {
  CodeIndexJobState,
  CodeIndexStatus,
} from './code-search.types.ts';

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

/** BullMQ job states that mean an index is in progress (not yet finished). */
const PENDING_JOB_STATES = new Set([
  'active',
  'delayed',
  'prioritized',
  'waiting',
  'waiting-children',
]);

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class CodeSearchResolver {
  constructor(
    private readonly codeSearch: CodeSearchService,
    private readonly repositories: WorkspaceLocalRepositoriesService,
    private readonly checkoutPathResolution: CheckoutPathResolutionService,
    private readonly checkouts: RepositoryCheckoutsRepository,
    private readonly effectiveUserResolution: EffectiveUserResolutionService,
    @InjectQueue(CODE_INDEX_QUEUE_NAME)
    private readonly queue: Queue<CodeIndexJobPayload, CodeIndexJobResult>,
  ) {}

  @Query(() => CodeSemanticSearchResult, {
    description: `Natural-language code semantic search over a registered repository's indexed code. available=false when no embeddings provider is configured, or a hosted one is not opted in for code.`,
  })
  @Permissions(PERMISSIONS.CODE_READ)
  async codeSemanticSearch(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => CodeSemanticSearchInput })
    input: CodeSemanticSearchInput,
  ): Promise<CodeSemanticSearchResult> {
    const filesystemPath = await this.resolveSearchRepositoryPath(
      input,
      userId,
    );

    if (
      !this.codeSearch.isProviderConfigured() ||
      this.codeSearch.codeIndexingRefusal() !== null
    ) {
      return { available: false, matches: [] };
    }

    const limit = Math.min(
      Math.max(1, input.limit ?? DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_LIMIT,
    );
    const matches = await this.codeSearch.codeSemanticSearch(
      filesystemPath,
      input.query,
      limit,
    );

    const ranked = [...matches].sort((a, b) => b.score - a.score);

    return { available: true, matches: ranked };
  }

  @Query(() => CodeIndexStatusObject, {
    description: `Index status for a registered repository: unavailable, hostedOptInRequired, indexing, ready, or notIndexed.`,
  })
  @Permissions(PERMISSIONS.CODE_READ)
  async codeIndexStatus(
    @CurrentUser('sub') sub: string,
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<CodeIndexStatusObject> {
    const filesystemPath = await this.resolveRepositoryPath(
      repositoryId,
      await this.actingUserId(sub),
    );

    if (!this.codeSearch.isProviderConfigured()) {
      return {
        failedReason: null,
        indexedChunks: 0,
        repositoryId,
        status: CODE_INDEX_STATUS.unavailable,
      };
    }

    if (this.codeSearch.codeIndexingRefusal() !== null) {
      return {
        failedReason: null,
        indexedChunks: 0,
        repositoryId,
        status: CODE_INDEX_STATUS.hostedOptInRequired,
      };
    }

    const [indexedChunks, job] = await Promise.all([
      this.codeSearch.indexedChunkCount(filesystemPath),
      this.indexJobState(repositoryId),
    ]);

    if (job?.state === 'failed') {
      return {
        failedReason: job.failedReason,
        indexedChunks,
        repositoryId,
        status: CODE_INDEX_STATUS.failed,
      };
    }

    let status: CodeIndexStatus = CODE_INDEX_STATUS.notIndexed;
    if (job !== undefined && PENDING_JOB_STATES.has(job.state)) {
      status = CODE_INDEX_STATUS.indexing;
    } else if (indexedChunks > 0) {
      status = CODE_INDEX_STATUS.ready;
    }

    return { failedReason: null, indexedChunks, repositoryId, status };
  }

  @Mutation(() => IndexCodeRepositoryResult, {
    description: `Enqueue a full re-index of a registered repository's code. Returns indexing; unavailable when no embeddings provider is configured; hostedOptInRequired when a hosted provider is not opted in for code (CODE_EMBEDDINGS_ALLOW_HOSTED).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async indexCodeRepository(
    @CurrentUser('sub') userId: string,
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<IndexCodeRepositoryResult> {
    // Validates existence + ownership before enqueuing.
    await this.resolveRepositoryPath(repositoryId, userId);

    if (!this.codeSearch.isProviderConfigured()) {
      return { repositoryId, status: CODE_INDEX_STATUS.unavailable };
    }

    if (this.codeSearch.codeIndexingRefusal() !== null) {
      return { repositoryId, status: CODE_INDEX_STATUS.hostedOptInRequired };
    }

    // jobId = repositoryId dedupes concurrent indexing for the same repo. A failed job is kept so
    // codeIndexStatus can report it (a dropped one read as `ready` over a partial index), and is
    // removed here first, because BullMQ ignores an add whose jobId already exists.
    const previous = await this.indexJobState(repositoryId);
    if (previous?.state === 'failed') {
      await previous.job.remove();
    }

    await this.queue.add(
      INDEX_CODE_REPOSITORY_JOB_NAME,
      { repositoryId, userId },
      { jobId: repositoryId, removeOnComplete: true, removeOnFail: false },
    );

    return { repositoryId, status: CODE_INDEX_STATUS.indexing };
  }

  /**
   * @description Resolves a registered repository's absolute filesystem path for the current user.
   * Throws BadRequestException for a blank or unknown/unowned repositoryId (never trusts a path).
   */
  private async resolveRepositoryPath(
    repositoryId: string,
    userId: string,
  ): Promise<string> {
    const id = repositoryId?.trim();
    if (!id) {
      throw new BadRequestException('A repositoryId is required.');
    }
    const repository = await this.repositories.findByIdForUser(id, userId);
    if (repository === null) {
      throw new BadRequestException(
        `No registered repository ${id} found for the current user.`,
      );
    }
    // Stored host-truthful; translated to this process's view when the Docker
    // workspace bridge is active (identity otherwise).
    return toContainerPath(repository.filesystemPath);
  }

  /**
   * @description The user whose repositories a read is scoped to. A service account (the MCP's
   * usual caller) owns no repositories itself, so it resolves to the human it acts for; a human
   * sub is returned unchanged.
   */
  private async actingUserId(sub: string): Promise<string> {
    return (
      (await this.effectiveUserResolution.resolveEffectiveUserId(sub)) ?? sub
    );
  }

  /**
   * @description The repository path a search runs over. The sub may be a service account (the
   * MCP's usual caller), which is resolved to the human it acts for first. An explicit
   * repositoryId wins; otherwise workspacePath is resolved against that user's registered
   * checkouts (the deepest one containing it), falling back to an indexed checkout of the same
   * repository when that one has no index.
   */
  private async resolveSearchRepositoryPath(
    input: CodeSemanticSearchInput,
    sub: string,
  ): Promise<string> {
    const userId = await this.actingUserId(sub);
    const repositoryId = input.repositoryId?.trim() ?? '';
    if (repositoryId !== '') {
      return this.resolveRepositoryPath(repositoryId, userId);
    }

    const workspacePath = input.workspacePath?.trim() ?? '';
    if (workspacePath === '') {
      throw new BadRequestException(
        'A repositoryId or a workspacePath is required.',
      );
    }

    const resolved = await this.checkoutPathResolution.resolveCheckoutForPath({
      path: workspacePath,
      userId,
    });
    if (resolved === null) {
      throw new BadRequestException(
        `No registered checkout contains ${workspacePath}; pass a repositoryId instead.`,
      );
    }

    // A WorkspaceLocalRepository id is a checkout id, so the deepest registered
    // checkout containing the path is the one searched — unless it has no index.
    const checkoutPath = await this.resolveRepositoryPath(
      resolved.checkoutId,
      userId,
    );
    if ((await this.codeSearch.indexedChunkCount(checkoutPath)) > 0) {
      return checkoutPath;
    }

    const indexedPath = await this.indexedSiblingCheckoutPath(
      resolved.repositoryId,
      userId,
    );

    return indexedPath ?? checkoutPath;
  }

  /**
   * @description An indexed checkout of the same repository, primary first. Only the checkout a
   * user indexes from /ide is indexed (worktrees and plan-run checkouts never are), so a search
   * started inside a worktree would otherwise find nothing; the primary's index is what a review
   * for existing code wants anyway. Null when no checkout of the repository is indexed.
   */
  private async indexedSiblingCheckoutPath(
    repositoryId: string,
    userId: string,
  ): Promise<string | null> {
    const checkouts = await this.checkouts.findByRepositoryIdForUser(
      repositoryId,
      userId,
    );
    const primaryFirst = [...checkouts].sort((a, b) => {
      return Number(b.kind === 'primary') - Number(a.kind === 'primary');
    });
    const paths = primaryFirst.map((checkout) => {
      return toContainerPath(checkout.filesystemPath);
    });
    const counts = await Promise.all(
      paths.map((path) => this.codeSearch.indexedChunkCount(path)),
    );
    const index = counts.findIndex((count) => count > 0);

    return paths[index] ?? null;
  }

  /** The repository's code-index job and its state, or undefined when there is none. */
  private async indexJobState(
    repositoryId: string,
  ): Promise<CodeIndexJobState | undefined> {
    const job = await this.queue.getJob(repositoryId);
    if (!job) {
      return undefined;
    }
    const state = await job.getState();
    const failedReason = job.failedReason ? job.failedReason : null;
    return { failedReason, job, state };
  }
}
