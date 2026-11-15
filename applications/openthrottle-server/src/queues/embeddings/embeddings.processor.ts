/**
 * @description Processes embed-entity jobs (OT plan 165e86ef): load the row's text through the
 * shared per-entity SQL, hash exactly what would be embedded, and skip when the stored vector
 * already has that hash and the configured model. Otherwise embed it and upsert one row with
 * its model, dimension and hash. A row that is gone, soft-deleted or empty loses its stale
 * vector.
 *
 * Code chunks (OT plan e489d73d) arrive as one job per page of `code_embeddings` ids: each row
 * is re-embedded from its own `content` and updated in place, skipping rows already current.
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
  CODE_EMBEDDINGS_TABLE,
  EMBED_ENTITY_UNCONFIGURED_DELAY_MS,
  EMBEDDING_SOURCES,
  EMBEDDINGS_CONCURRENCY,
  EMBEDDINGS_QUEUE_NAME,
} from './embeddings.constants.ts';
import type {
  EmbedCodeChunksJobData,
  EmbeddingsJob,
  EmbeddingSource,
  EmbedEntityJobResult,
} from './embeddings.types.ts';
import {
  isCodeChunksJobData,
  isEmbeddableEntity,
  sha256Hex,
} from './embeddings.utils.ts';

/** @description One `code_embeddings` row as the code-chunk job reads it. */
interface CodeChunkRow {
  readonly content: string;
  readonly contentHash: string | undefined;
  readonly hasEmbedding: boolean;
  readonly id: string;
  readonly model: string | undefined;
}

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
    job: EmbeddingsJob,
    token?: string,
  ): Promise<EmbedEntityJobResult> {
    const data = job.data;

    if (isCodeChunksJobData(data)) {
      return this.processCodeChunks(job, data, token);
    }

    const { entity, id } = data;

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

  /**
   * @description Re-embeds the page's rows that are missing a vector, carry another model, or
   * were hashed from other text, in one embedder call and one UPDATE. Rows deleted since the page
   * was read are simply absent.
   */
  private async processCodeChunks(
    job: EmbeddingsJob,
    data: EmbedCodeChunksJobData,
    token: string | undefined,
  ): Promise<EmbedEntityJobResult> {
    const config = this.embedder.getConfig();

    if (!config) {
      const detail = this.embedder.getStatus().detail ?? 'not configured';

      await this.delay(job, token, `unconfigured: ${detail}`);

      return { outcome: 'delayed' };
    }

    const rows = await this.loadCodeChunks(data.ids);
    const pending = rows
      .map((row) => {
        const hash = sha256Hex(
          prepareEmbeddingInput(config, row.content, 'document'),
        );

        return { hash, row };
      })
      .filter(({ hash, row }) => {
        const isCurrent =
          row.hasEmbedding &&
          row.model === config.model &&
          row.contentHash === hash;

        return row.content.trim() !== '' && !isCurrent;
      });

    if (pending.length === 0) {
      return { outcome: 'unchanged' };
    }

    const result = await this.embedder.embed(
      pending.map(({ row }) => {
        return row.content;
      }),
      'document',
    );

    if (!result.ok) {
      if (result.reason === 'provider_error') {
        throw new Error(
          `Embedding ${pending.length} code chunk(s) failed: ${result.detail}`,
        );
      }

      await this.delay(job, token, `${result.reason}: ${result.detail}`);

      return { outcome: 'delayed' };
    }

    if (result.vectors.length !== pending.length) {
      throw new Error(
        `Embedding ${pending.length} code chunk(s) returned ${result.vectors.length} vector(s).`,
      );
    }

    await this.dataSource.query(
      `UPDATE ${CODE_EMBEDDINGS_TABLE} AS c
          SET embedding = v.embedding::vector,
              embedding_model = $4,
              embedding_dims = $5,
              content_hash = v.content_hash
         FROM unnest($1::text[], $2::text[], $3::text[]) AS v (id, embedding, content_hash)
        WHERE c.id = v.id`,
      [
        pending.map(({ row }) => {
          return row.id;
        }),
        result.vectors.map((vector) => {
          return `[${vector.join(',')}]`;
        }),
        pending.map(({ hash }) => {
          return hash;
        }),
        result.model,
        result.dims,
      ],
    );

    return { outcome: 'embedded' };
  }

  private async loadCodeChunks(
    ids: readonly string[],
  ): Promise<CodeChunkRow[]> {
    const rows: unknown = await this.dataSource.query(
      `SELECT id, content, content_hash, embedding_model, embedding IS NOT NULL AS has_embedding
         FROM ${CODE_EMBEDDINGS_TABLE}
        WHERE id = ANY($1::text[])`,
      [[...ids]],
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.flatMap((row: unknown) => {
      const id = readField(row, 'id');
      const content = readField(row, 'content');

      if (id === undefined || content === undefined) {
        return [];
      }

      return [
        {
          content,
          contentHash: readField(row, 'content_hash'),
          hasEmbedding: readFlag(row, 'has_embedding'),
          id,
          model: readField(row, 'embedding_model'),
        },
      ];
    });
  }

  private async delay(
    job: EmbeddingsJob,
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

  return readField(rows[0], column);
}

function readField(row: unknown, column: string): string | undefined {
  if (typeof row !== 'object' || row === null) {
    return undefined;
  }

  const value: unknown = Reflect.get(row, column);

  return typeof value === 'string' ? value : undefined;
}

function readFlag(row: unknown, column: string): boolean {
  if (typeof row !== 'object' || row === null) {
    return false;
  }

  return Reflect.get(row, column) === true;
}
