/**
 * @description BullMQ processor for full code-workspace re-indexing. Resolves the registered
 * repository's filesystem path (user-scoped), then runs the openthrottle-ide engine server-side via
 * @openthrottle/nestjs-vector-search to chunk → embed → upsert into code_embeddings. Backs the /ide
 * Semantic tab's "Index" action; status is derived by the codeIndexStatus GraphQL query.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { WorkspaceLocalRepositoriesService } from '@openthrottle/nestjs-repositories';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { CODE_INDEX_QUEUE_NAME } from './code-index.constants';
import type { CodeIndexJob, CodeIndexJobResult } from './code-index.types';

const CONCURRENCY = 1;

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
        'No embeddings provider configured. Set OPENAI_API_KEY or OLLAMA_BASE_URL / OLLAMA_EMBEDDING_MODEL.',
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

    this.logger.info(
      `Indexing repository ${repositoryId} at ${repository.filesystemPath}`,
      logContext,
    );

    const { deletedPaths, embedded } = await this.codeSearch.indexCodeWorkspace(
      repository.filesystemPath,
    );

    const result: CodeIndexJobResult = { deletedPaths, embedded, repositoryId };
    this.logger.info(
      `Code-index job finished: ${JSON.stringify(result)}`,
      logContext,
    );
    return result;
  }
}
