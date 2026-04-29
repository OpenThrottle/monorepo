/**
 * @description BullMQ processor for diff-based doc ingestion. Runs diff, de-indexes to-remove,
 * runs existing openthrottle:import-docs for to-add/to-update, then persists prior state.
 * See docs/openthrottle/doc-ingestion-job-spec.md and @tools/workflows/doc-ingestion.
 */

import { spawn } from 'node:child_process';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import {
  computeDocIngestionDiff,
  deindexDocumentationByPath,
  getDocIngestionStateConnectionString,
  removePriorState,
  savePriorState,
} from '@tools/workflows/doc-ingestion';
import { DOC_INGESTION_QUEUE_NAME } from './doc-ingestion.constants';
import type {
  DocIngestionJob,
  DocIngestionJobResult,
} from './doc-ingestion.types';

const CONCURRENCY = 1;

/**
 * @description Resolves the monorepo root for running openthrottle:import-docs. Set WORKSPACE_ROOT when the API is not started from the repo root.
 */
function getWorkspaceRoot(): string {
  return process.env.WORKSPACE_ROOT ?? process.cwd();
}

/**
 * @description Spawns pnpm run openthrottle:import-docs with env and waits for exit. Resolves with exit code or null if signaled.
 */
function spawnIngestDocs(
  env: NodeJS.ProcessEnv,
  cwd: string,
  onStdout: (chunk: string) => void,
  onStderr: (chunk: string) => void,
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['run', 'openthrottle:import-docs'], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data: Buffer) => onStdout(data.toString()));
    child.stderr?.on('data', (data: Buffer) => onStderr(data.toString()));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve(signal != null ? null : (code ?? null));
    });
  });
}

/**
 * @description Processes doc-ingestion jobs: diff → deindex to-remove → ingest to-add/to-update → persist state.
 */
@Processor(DOC_INGESTION_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class DocIngestionProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(private readonly logger: LoggerService) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Doc-ingestion queue worker started (concurrency=${CONCURRENCY})`,
      DocIngestionProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Doc-ingestion queue worker shutting down (signal=${signal ?? 'unknown'})`,
      DocIngestionProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: DocIngestionJob): Promise<DocIngestionJobResult> {
    const { data: payload, id: jobId } = job;
    const logContext = `${DocIngestionProcessor.name} [jobId=${jobId}]`;

    const directories = payload.directories ?? [];
    const files = payload.files ?? [];
    if (directories.length === 0 && files.length === 0) {
      throw new Error(
        'Doc-ingestion job requires at least one of directories or files in the payload.',
      );
    }

    const connectionString = getDocIngestionStateConnectionString();
    if (!connectionString) {
      throw new Error(
        'Postgres not configured. Set POSTGRES_URL or POSTGRES_* for doc-ingestion.',
      );
    }

    const workspaceRoot = getWorkspaceRoot();
    const scope = payload.scope ?? 'default';
    const repo = payload.repo ?? 'local/repo';
    const sha = payload.sha ?? 'local';

    const diff = await computeDocIngestionDiff({
      connectionString,
      payload,
      scope,
      workspaceRoot,
    });

    let deindexedCount = 0;
    if (diff.toRemove.length > 0) {
      deindexedCount = await deindexDocumentationByPath({
        connectionString,
        paths: diff.toRemove,
        repo,
      });
      this.logger.info(
        `De-indexed ${deindexedCount} path(s) (to-remove): ${diff.toRemove.length}`,
        logContext,
      );
      await removePriorState(connectionString, scope, diff.toRemove);
    }

    const toIngest = [...diff.toAdd, ...diff.toUpdate];
    let ingestedCount = 0;

    if (toIngest.length > 0) {
      const docsPaths = toIngest.join(',');
      const env: NodeJS.ProcessEnv = {
        DOCS_PATHS: docsPaths,
        DOCS_REPO: repo,
        DOCS_SHA: sha,
      };

      const onStdout = (chunk: string): void => {
        this.logger.info(chunk.trimEnd(), logContext);
      };
      const onStderr = (chunk: string): void => {
        this.logger.warn(chunk.trimEnd(), logContext);
      };

      const exitCode = await spawnIngestDocs(
        env,
        workspaceRoot,
        onStdout,
        onStderr,
      );

      if (exitCode !== 0) {
        throw new Error(
          `openthrottle:import-docs exited with code ${exitCode ?? 'signal'}. Not persisting prior state.`,
        );
      }

      ingestedCount = toIngest.length;
      const stateEntries = toIngest
        .map((path) => {
          const contentHash = diff.currentHashes.get(path);
          return contentHash != null ? { contentHash, path } : null;
        })
        .filter((e): e is { path: string; contentHash: string } => e !== null);
      await savePriorState(connectionString, scope, stateEntries);
    }

    const result: DocIngestionJobResult = {
      deindexedCount,
      ingestedCount,
      toAddCount: diff.toAdd.length,
      toRemoveCount: diff.toRemove.length,
      toUpdateCount: diff.toUpdate.length,
    };

    this.logger.info(
      `Doc-ingestion job finished: ${JSON.stringify(result)}`,
      logContext,
    );
    return result;
  }
}
