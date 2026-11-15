/**
 * @description Computes the embeddings section of server health (OT plan 165e86ef): the
 * embedder's live state, per-table coverage and stale counts (hashed in SQL exactly as the
 * reconciler does), and the embeddings queue backlog. Selected only on demand — it hashes every
 * source row, so the Docker-polled REST /health does not include it.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  EMBEDDING_MAX_INPUT_CHARS,
  resolveEmbeddingConfig,
} from '@openthrottle/node-client';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';

import {
  EMBEDDABLE_ENTITIES,
  EMBEDDING_SOURCES,
  EMBEDDINGS_QUEUE_NAME,
} from '../../../queues/embeddings/embeddings.constants.ts';
import type { EmbeddableEntity } from '../../../queues/embeddings/embeddings.types.ts';
import { contentHashSql } from '../../../queues/embeddings/embeddings.utils.ts';
import { EmbedderService } from '../../../services/embedder/embedder.service.ts';
import type { EmbeddingsHealthObject } from './embeddings-health.object.ts';
import type { EmbeddingCoverage } from './embeddings-health.types.ts';
import {
  classifyEmbeddingsHealth,
  resolveEmbeddingsHealthThresholds,
} from './embeddings-health.utils.ts';

@Injectable()
export class EmbeddingsHealthService {
  constructor(
    private readonly logger: LoggerService,
    private readonly embedder: EmbedderService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectQueue(EMBEDDINGS_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async getEmbeddingsHealth(): Promise<EmbeddingsHealthObject> {
    const status = this.embedder.getStatus();
    const [coverage, queueDepth] = await Promise.all([
      this.readCoverage(),
      this.readQueueDepth(),
    ]);

    return {
      coverage: [...coverage],
      detail: status.detail,
      dims: status.dims,
      model: status.model,
      provider: status.provider,
      queueDepth,
      staleCount: coverage.reduce((sum, table) => {
        return sum + table.stale;
      }, 0),
      status: classifyEmbeddingsHealth(
        status.state,
        coverage,
        queueDepth,
        resolveEmbeddingsHealthThresholds(),
      ),
    };
  }

  /**
   * @description Coverage against the configured model, or — when the env was refused — the
   * default model the columns are built for, so an unconfigured server still reports how much is
   * already embedded.
   */
  private async readCoverage(): Promise<EmbeddingCoverage[]> {
    const config = this.embedder.getConfig() ?? resolveDefaultConfig();

    if (!config) {
      return [];
    }

    return Promise.all(
      EMBEDDABLE_ENTITIES.map((entity) => {
        return this.readEntityCoverage(
          entity,
          config.spec.documentPrefix,
          config.model,
        );
      }),
    );
  }

  private async readEntityCoverage(
    entity: EmbeddableEntity,
    documentPrefix: string,
    model: string,
  ): Promise<EmbeddingCoverage> {
    const source = EMBEDDING_SOURCES[entity];
    const isCurrent = `e.embedding_model = $3 AND e.content_hash = ${contentHashSql(source, '$1', '$2')}`;
    const rows: unknown = await this.dataSource.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE e.${source.fkColumn} IS NOT NULL AND ${isCurrent})::int AS embedded,
              count(*) FILTER (WHERE e.${source.fkColumn} IS NOT NULL AND NOT (${isCurrent}))::int AS stale
         FROM ${source.fromSql}
         LEFT JOIN ${source.embeddingTable} e ON e.${source.fkColumn} = s.id
        WHERE (${source.whereSql})
          AND btrim(${source.contentSql}, E' \\t\\n\\r') <> ''`,
      [documentPrefix, EMBEDDING_MAX_INPUT_CHARS, model],
    );
    const row: unknown = Array.isArray(rows) ? rows[0] : undefined;

    return {
      embedded: readCount(row, 'embedded'),
      entity,
      stale: readCount(row, 'stale'),
      table: source.embeddingTable,
      total: readCount(row, 'total'),
    };
  }

  private async readQueueDepth(): Promise<number | null> {
    try {
      const counts = await this.queue.getJobCounts(
        'active',
        'delayed',
        'paused',
        'prioritized',
        'waiting',
      );

      return Object.values(counts).reduce((sum, count) => {
        return sum + count;
      }, 0);
    } catch (error: unknown) {
      this.logger.warn(
        `Embeddings queue depth unavailable: ${error instanceof Error ? error.message : String(error)}`,
        EmbeddingsHealthService.name,
      );

      return null;
    }
  }
}

function resolveDefaultConfig(): ReturnType<EmbedderService['getConfig']> {
  const result = resolveEmbeddingConfig({});

  return result.ok ? result.config : undefined;
}

function readCount(row: unknown, key: string): number {
  if (typeof row !== 'object' || row === null) {
    return 0;
  }

  const value: unknown = Reflect.get(row, key);

  return typeof value === 'number' ? value : Number(value ?? 0);
}
