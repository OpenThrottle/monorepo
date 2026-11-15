/**
 * @description Processes embed-entity jobs (OT plan 165e86ef): load the row's text through the
 * shared per-entity SQL, hash exactly what would be embedded, and skip when the stored vector
 * already has that hash and the configured model. Otherwise embed it and upsert one row with
 * its model, dimension and hash. A row that is gone, soft-deleted or empty loses its stale
 * vector.
 *
 * Failure policy: a provider error throws, so BullMQ retries with exponential backoff; an
 * unconfigured embedder or a dimension mismatch re-delays the job without spending an attempt,
 * so the backlog drains by itself once the config is fixed.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { prepareEmbeddingInput } from '@openthrottle/node-client';
import { DelayedError } from 'bullmq';
import { DataSource } from 'typeorm';

import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import {
  EMBED_ENTITY_UNCONFIGURED_DELAY_MS,
  EMBEDDING_SOURCES,
  EMBEDDINGS_CONCURRENCY,
  EMBEDDINGS_QUEUE_NAME,
} from './embeddings.constants.ts';
import type {
  EmbeddingSource,
  EmbedEntityJob,
  EmbedEntityJobResult,
} from './embeddings.types.ts';
import { isEmbeddableEntity, sha256Hex } from './embeddings.utils.ts';

@Processor(EMBEDDINGS_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: EMBEDDINGS_CONCURRENCY,
})
export class EmbeddingsProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly embedder: EmbedderService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Embeddings queue worker started (concurrency=${EMBEDDINGS_CONCURRENCY})`,
      EmbeddingsProcessor.name,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker.close();
  }

  async process(
    job: EmbedEntityJob,
    token?: string,
  ): Promise<EmbedEntityJobResult> {
    const { entity, id } = job.data;

    if (!isEmbeddableEntity(entity) || !id) {
      throw new Error(
        `Embedding job ${job.id ?? '?'} has an invalid payload (entity=${String(entity)}).`,
      );
    }

    const source = EMBEDDING_SOURCES[entity];
    const content = await this.loadContent(source, id);

    if (content === undefined || content.trim() === '') {
      await this.dataSource.query(
        `DELETE FROM ${source.embeddingTable} WHERE ${source.fkColumn} = $1`,
        [id],
      );

      return { outcome: 'removed' };
    }

    const config = this.embedder.getConfig();
    const hash = config
      ? sha256Hex(prepareEmbeddingInput(config, content, 'document'))
      : undefined;

    if (config && hash) {
      const stored = await this.loadStored(source, id);

      if (stored?.contentHash === hash && stored.model === config.model) {
        return { outcome: 'unchanged' };
      }
    }

    const result = await this.embedder.embed([content], 'document');

    if (!result.ok) {
      if (result.reason === 'provider_error') {
        throw new Error(`Embedding ${entity} ${id} failed: ${result.detail}`);
      }

      await this.delay(job, token, `${result.reason}: ${result.detail}`);

      return { outcome: 'delayed' };
    }

    const vector = result.vectors[0];

    if (!hash || !vector) {
      throw new Error(`Embedding ${entity} ${id} returned no vector.`);
    }

    await this.dataSource.query(
      `INSERT INTO ${source.embeddingTable}
         (${source.fkColumn}, content, embedding, embedding_model, embedding_dims, content_hash, metadata)
       VALUES ($1, $2, $3::vector, $4, $5, $6, '{}'::jsonb)
       ON CONFLICT (${source.fkColumn}) DO UPDATE SET
         content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         embedding_model = EXCLUDED.embedding_model,
         embedding_dims = EXCLUDED.embedding_dims,
         content_hash = EXCLUDED.content_hash,
         created_at = NOW()`,
      [id, content, `[${vector.join(',')}]`, result.model, result.dims, hash],
    );

    return { outcome: 'embedded' };
  }

  private async delay(
    job: EmbedEntityJob,
    token: string | undefined,
    reason: string,
  ): Promise<void> {
    this.logger.warn(
      `Embedding job ${job.id ?? '?'} re-delayed ${EMBED_ENTITY_UNCONFIGURED_DELAY_MS / 1000}s: ${reason}`,
      EmbeddingsProcessor.name,
    );

    await job.moveToDelayed(
      Date.now() + EMBED_ENTITY_UNCONFIGURED_DELAY_MS,
      token,
    );

    // Tells BullMQ the job moved itself; it is neither completed nor failed.
    throw new DelayedError();
  }

  private async loadContent(
    source: EmbeddingSource,
    id: string,
  ): Promise<string | undefined> {
    const rows: unknown = await this.dataSource.query(
      `SELECT ${source.contentSql} AS content FROM ${source.fromSql} WHERE s.id = $1 AND (${source.whereSql})`,
      [id],
    );

    return readColumn(rows, 'content');
  }

  private async loadStored(
    source: EmbeddingSource,
    id: string,
  ): Promise<
    | {
        readonly contentHash: string | undefined;
        readonly model: string | undefined;
      }
    | undefined
  > {
    const rows: unknown = await this.dataSource.query(
      `SELECT content_hash, embedding_model FROM ${source.embeddingTable} WHERE ${source.fkColumn} = $1`,
      [id],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return undefined;
    }

    return {
      contentHash: readColumn(rows, 'content_hash'),
      model: readColumn(rows, 'embedding_model'),
    };
  }
}

function readColumn(rows: unknown, column: string): string | undefined {
  if (!Array.isArray(rows)) {
    return undefined;
  }

  const row: unknown = rows[0];

  if (typeof row !== 'object' || row === null) {
    return undefined;
  }

  const value: unknown = Reflect.get(row, column);

  return typeof value === 'string' ? value : undefined;
}
