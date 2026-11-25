/**
 * @description The server's single embedder (OT plan 165e86ef). One instance per process owns
 * the local model's worker thread; the embeddings queue processor and every search resolver go
 * through it. Search embeds pass `'query'` and background work passes `'document'`: the local
 * backend runs queries first, so a search waits at most one background slice behind a backfill
 * (OT plan ca13e543). A boot probe embeds one string and compares the vector length with the
 * `vector(N)` the five embedding tables declare, so a missing model, a down provider or a
 * dimension mismatch is logged at error and visible in `health` instead of silently producing
 * empty search results.
 */
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Embedder,
  EmbeddingConfig,
  EmbeddingConfigResult,
  EmbeddingInputType,
  EmbedFailure,
  EmbedResult,
} from '@openthrottle/node-client';
import {
  createEmbedder,
  resolveEmbeddingConfig,
} from '@openthrottle/node-client';
import { toErrorMessage } from '@openthrottle/nodejs-utils';
import { DataSource } from 'typeorm';

import { EMBEDDER_PROBE_TEXT, EMBEDDING_TABLES } from './embedder.constants.ts';
import type {
  EmbedderState,
  EmbedderStatus,
  EmbeddingColumnDims,
} from './embedder.types.ts';
import { formatLexicalOnlyBanner } from './embedder.utils.ts';

@Injectable()
export class EmbedderService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly configResult: EmbeddingConfigResult;

  private readonly embedder: Embedder | undefined;

  private columnMismatch: EmbedFailure | undefined;

  private status: EmbedderStatus;

  constructor(
    private readonly logger: LoggerService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.configResult = resolveEmbeddingConfig();
    this.embedder = this.configResult.ok
      ? createEmbedder(this.configResult.config)
      : undefined;
    this.columnMismatch = undefined;
    this.status = initialStatus(this.configResult);
  }

  /** @description Runs the boot probe without blocking boot: loading the model takes seconds. */
  onApplicationBootstrap(): void {
    void this.probe();
  }

  async onModuleDestroy(): Promise<void> {
    await this.embedder?.close();
  }

  /** @description The resolved config, or undefined when the env was refused. */
  getConfig(): EmbeddingConfig | undefined {
    return this.configResult.ok ? this.configResult.config : undefined;
  }

  getStatus(): EmbedderStatus {
    return this.status;
  }

  /**
   * @description Embeds texts with the configured model. Never throws: an unconfigured env, a
   * column whose dimension disagrees with the model, or a provider failure comes back as an
   * {@link EmbedFailure}. A success after a failure flips the status back to `ok`, so a provider
   * that comes back up recovers without a restart.
   */
  async embed(
    texts: readonly string[],
    inputType: EmbeddingInputType,
  ): Promise<EmbedResult> {
    if (!this.embedder) {
      return {
        detail: this.status.detail ?? 'embedder is not configured',
        ok: false,
        reason: 'unconfigured',
      };
    }

    if (this.columnMismatch) {
      return this.columnMismatch;
    }

    const result = await this.embedder.embed(texts, inputType);

    this.record(result);

    return result;
  }

  /**
   * @description Checks the embedding columns' declared dimension, then embeds one string. Logs
   * at error on any failure. Safe to call again (e.g. after downloading the weights).
   */
  async probe(): Promise<EmbedderStatus> {
    const config = this.getConfig();

    if (!config) {
      this.logger.error(
        formatLexicalOnlyBanner({
          detail: this.status.detail ?? 'unknown',
          provider: this.status.provider,
          state: 'unconfigured',
        }),
        EmbedderService.name,
      );

      return this.status;
    }

    this.columnMismatch = await this.checkColumns(config);

    if (this.columnMismatch) {
      this.setStatus('dimension_mismatch', this.columnMismatch.detail);
      this.logger.error(
        `Embedder dimension mismatch: ${this.columnMismatch.detail}`,
        EmbedderService.name,
      );

      return this.status;
    }

    const result = await this.embed([EMBEDDER_PROBE_TEXT], 'document');

    if (result.ok) {
      this.logger.log(
        `Embedder ready: ${config.provider} ${config.model} (${config.dims} dims).`,
        EmbedderService.name,
      );
    } else {
      this.logger.error(
        formatLexicalOnlyBanner({
          detail: result.detail,
          provider: config.provider,
          state: result.reason,
        }),
        EmbedderService.name,
      );
    }

    return this.status;
  }

  private async checkColumns(
    config: EmbeddingConfig,
  ): Promise<EmbedFailure | undefined> {
    let columns: EmbeddingColumnDims[];

    try {
      columns = await this.readColumnDims();
    } catch (error: unknown) {
      // The database being down is the database's health problem, not the embedder's.
      this.logger.warn(
        `Embedder could not read embedding column dimensions: ${toErrorMessage(error)}`,
        EmbedderService.name,
      );

      return undefined;
    }

    const wrong = columns.filter((column) => {
      return column.dims !== config.dims;
    });

    if (wrong.length === 0) {
      return undefined;
    }

    const described = wrong
      .map((column) => {
        return `${column.table}=${column.dims === null ? 'missing' : `vector(${column.dims})`}`;
      })
      .join(', ');

    return {
      detail: `${config.model} produces ${config.dims} dims but ${described}. Apply the embedding migrations (pnpm run database:migrate).`,
      ok: false,
      reason: 'dimension_mismatch',
    };
  }

  private async readColumnDims(): Promise<EmbeddingColumnDims[]> {
    const rows: unknown = await this.dataSource.query(
      `SELECT c.relname AS table_name, format_type(a.atttypid, a.atttypmod) AS column_type
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
        WHERE c.relname = ANY($1)
          AND c.relnamespace = current_schema()::regnamespace
          AND a.attname = 'embedding'
          AND NOT a.attisdropped`,
      [EMBEDDING_TABLES],
    );
    const found = new Map<string, number | null>();

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const table = readString(row, 'table_name');
        const type = readString(row, 'column_type');
        const match = /^vector\((\d+)\)$/.exec(type ?? '');

        if (table) {
          found.set(table, match?.[1] ? Number(match[1]) : null);
        }
      }
    }

    return EMBEDDING_TABLES.map((table) => {
      return { dims: found.get(table) ?? null, table };
    });
  }

  private record(result: EmbedResult): void {
    if (result.ok) {
      this.setStatus('ok', null);
      return;
    }

    this.setStatus(result.reason, result.detail);
  }

  private setStatus(state: EmbedderState, detail: string | null): void {
    this.status = { ...this.status, checkedAt: new Date(), detail, state };
  }
}

function initialStatus(configResult: EmbeddingConfigResult): EmbedderStatus {
  if (!configResult.ok) {
    return {
      checkedAt: new Date(),
      detail: configResult.detail,
      dims: null,
      model: null,
      provider: configResult.provider,
      state: 'unconfigured',
    };
  }

  return {
    checkedAt: null,
    detail: null,
    dims: configResult.config.dims,
    model: configResult.config.model,
    provider: configResult.config.provider,
    state: 'starting',
  };
}

function readString(row: unknown, key: string): string | undefined {
  if (typeof row !== 'object' || row === null || !(key in row)) {
    return undefined;
  }

  const value: unknown = Reflect.get(row, key);

  return typeof value === 'string' ? value : undefined;
}
