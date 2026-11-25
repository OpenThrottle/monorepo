/**
 * @description BullMQ processor for full code-workspace re-indexing. Resolves the registered
 * repository's filesystem path (user-scoped), then runs the openthrottle-ide engine server-side via
 * @openthrottle/nestjs-vector-search to chunk → embed → upsert into code_embeddings. Backs the /ide
 * Semantic tab's "Index" action; status is derived by the codeIndexStatus GraphQL query.
 */

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';

import { WorkspaceLocalRepositoriesService } from '../../services/workspace-local-repositories/workspace-local-repositories.service.ts';
import { CODE_INDEX_QUEUE_NAME } from './code-index.constants.ts';
import type { CodeIndexJob, CodeIndexJobResult } from './code-index.types.ts';

const CONCURRENCY = 1;

/** How many skipped chunks a finished job names in its warning; the count is always logged. */
const SKIPPED_CHUNKS_LOGGED = 20;

/**
 * @description Processes code-index jobs: resolve repository → index workspace via the engine.
 */
@Processor(CODE_INDEX_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class CodeIndexProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly codeSearch: CodeSearchService,
    private readonly repositories: WorkspaceLocalRepositoriesService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Code-index queue worker started (concurrency=${CONCURRENCY})`,
      CodeIndexProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Code-index queue worker shutting down (signal=${signal ?? 'unknown'})`,
      CodeIndexProcessor.name,
    );
    await this.worker.close();
  }

  /** Logs a failed job as an error; the job is kept, so codeIndexStatus reports it as `failed`. */
  @OnWorkerEvent('failed')
  onJobFailed(job: CodeIndexJob | undefined, error: Error): void {
    this.logger.error(
      `Code-index job failed for repository ${job?.data.repositoryId ?? 'unknown'}: ${error.message}`,
      error.stack,
      `${CodeIndexProcessor.name} [jobId=${job?.id ?? 'unknown'}]`,
    );
  }

  async process(job: CodeIndexJob): Promise<CodeIndexJobResult> {
    const { repositoryId, userId } = job.data;
    const logContext = `${CodeIndexProcessor.name} [jobId=${job.id}]`;

    if (!repositoryId || !userId) {
      throw new Error(
        'Code-index job requires both repositoryId and userId in the payload.',
      );
    }

    if (!this.codeSearch.isProviderConfigured()) {
      throw new Error(
        'The embedder is unavailable (see health → embeddings). Download the model with `pnpm run embeddings:download-model` or check EMBEDDING_PROVIDER.',
      );
    }

    const repository = await this.repositories.findByIdForUser(
      repositoryId,
      userId,
    );
    if (repository === null) {
      throw new Error(
        `No registered repository ${repositoryId} found for the requesting user.`,
      );
    }

    // Stored host-truthful; index under this process's view, the same key CodeSearchResolver
    // searches and counts by. Identity unless the Docker workspace bridge is active.
    const workspaceRoot = toContainerPath(repository.filesystemPath);

    this.logger.info(
      `Indexing repository ${repositoryId} at ${workspaceRoot}`,
      logContext,
    );

    const { deletedPaths, embedded, skipped } =
      await this.codeSearch.indexCodeWorkspace(workspaceRoot);

    if (skipped.length > 0) {
      const named = skipped
        .slice(0, SKIPPED_CHUNKS_LOGGED)
        .map((chunk) => {
          return `${chunk.path}:${chunk.startLine}-${chunk.endLine} (${chunk.reason})`;
        })
        .join('; ');
      this.logger.warn(
        `Skipped ${skipped.length} chunk(s) the embedder or store rejected: ${named}`,
        logContext,
      );
    }

    const result: CodeIndexJobResult = {
      deletedPaths,
      embedded,
      repositoryId,
      skipped: skipped.length,
    };
    this.logger.info(
      `Code-index job finished: ${JSON.stringify(result)}`,
      logContext,
    );
    return result;
  }
}
