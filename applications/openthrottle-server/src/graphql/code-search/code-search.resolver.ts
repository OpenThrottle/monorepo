/**
 * @description GraphQL resolver for code semantic search over a registered repository. Resolves
 * repositoryId → filesystemPath server-side (user-scoped; never trusts a client path), runs search
 * via @openthrottle/nestjs-vector-search, enqueues async full re-index on the code-index BullMQ
 * queue, and derives index status. Backs the /ide Semantic tab.
 */

import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InjectQueue } from '@nestjs/bullmq';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { WorkspaceLocalRepositoriesService } from '@openthrottle/nestjs-repositories';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import { Queue } from 'bullmq';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  CODE_INDEX_QUEUE_NAME,
  INDEX_CODE_REPOSITORY_JOB_NAME,
} from '../../queues/code-index/code-index.constants';
import type {
  CodeIndexJobPayload,
  CodeIndexJobResult,
} from '../../queues/code-index/code-index.types';
import { CODE_INDEX_STATUS } from './code-index-status';
import { CodeSemanticSearchInput } from './code-search.input';
import {
  CodeIndexStatusObject,
  CodeSemanticSearchResult,
  IndexCodeRepositoryResult,
} from './code-search.object';

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
    @InjectQueue(CODE_INDEX_QUEUE_NAME)
    private readonly queue: Queue<CodeIndexJobPayload, CodeIndexJobResult>,
  ) {}

  @Query(() => CodeSemanticSearchResult, {
    description: `Natural-language code semantic search over a registered repository's indexed code. available=false when no embeddings provider is configured.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async codeSemanticSearch(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => CodeSemanticSearchInput })
    input: CodeSemanticSearchInput,
  ): Promise<CodeSemanticSearchResult> {
    const filesystemPath = await this.resolveRepositoryPath(
      input.repositoryId,
      userId,
    );

    if (!this.codeSearch.isProviderConfigured()) {
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

    return { available: true, matches };
  }

  @Query(() => CodeIndexStatusObject, {
    description: `Index status for a registered repository: unavailable, indexing, ready, or notIndexed.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async codeIndexStatus(
    @CurrentUser('sub') userId: string,
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<CodeIndexStatusObject> {
    const filesystemPath = await this.resolveRepositoryPath(
      repositoryId,
      userId,
    );

    if (!this.codeSearch.isProviderConfigured()) {
      return {
        indexedChunks: 0,
        repositoryId,
        status: CODE_INDEX_STATUS.unavailable,
      };
    }

    const indexedChunks =
      await this.codeSearch.indexedChunkCount(filesystemPath);
    const isPending = await this.isIndexJobPending(repositoryId);
    const status = isPending
      ? CODE_INDEX_STATUS.indexing
      : indexedChunks > 0
        ? CODE_INDEX_STATUS.ready
        : CODE_INDEX_STATUS.notIndexed;

    return { indexedChunks, repositoryId, status };
  }

  @Mutation(() => IndexCodeRepositoryResult, {
    description: `Enqueue a full re-index of a registered repository's code. Returns indexing, or unavailable when no embeddings provider is configured.`,
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

    // jobId = repositoryId dedupes concurrent indexing for the same repo;
    // removeOnComplete/Fail frees the id so a later re-index isn't blocked.
    await this.queue.add(
      INDEX_CODE_REPOSITORY_JOB_NAME,
      { repositoryId, userId },
      { jobId: repositoryId, removeOnComplete: true, removeOnFail: true },
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
    return repository.filesystemPath;
  }

  /** True when a code-index job for the repository is queued or running. */
  private async isIndexJobPending(repositoryId: string): Promise<boolean> {
    const job = await this.queue.getJob(repositoryId);
    if (!job) {
      return false;
    }
    const state = await job.getState();
    return PENDING_JOB_STATES.has(state);
  }
}
