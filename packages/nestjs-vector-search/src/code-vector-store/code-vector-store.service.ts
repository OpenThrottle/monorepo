import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { EmbeddingConfig } from '@openthrottle/node-client';
import { prepareEmbeddingInput } from '@openthrottle/node-client';
import type {
  StoredChunk,
  VectorMatch,
  VectorStore,
} from '@openthrottle/openthrottle-ide';
import { hashContent } from '@openthrottle/openthrottle-ide';
import { DataSource } from 'typeorm';

import { CODE_EMBEDDER } from '../code-embedder/code-embedder.token.ts';
import type { CodeEmbedder } from '../code-embedder/code-embedder.types.ts';

/** Columns bound per upserted row. */
const UPSERT_COLUMNS = 10;

/** Rows upserted per INSERT statement (10 columns/row; well under pg's parameter cap). */
const UPSERT_BATCH_SIZE = 200;

/** Raw row shape returned by {@link CodeVectorStore.query} (subset of code_embeddings + similarity). */
interface CodeMatchRow {
  readonly content: string;
  readonly end_line: number | string;
  readonly id: string;
  readonly path: string;
  readonly similarity: number | string;
  readonly start_line: number | string;
}

/**
 * @description Serializes an embedding to the Postgres pgvector text literal (`[v1,v2,…]`), passed as a
 * bound parameter and cast with `::vector` in SQL.
 *
 * Asserts the embedding has the expected width and that every slot is finite first: a `NaN`/`Infinity`/
 * `undefined` slot would stringify to `NaN`/`Infinity`/empty and produce a malformed `::vector` literal,
 * surfacing as an opaque pg parse error deep in a query. This is not an injection vector (numbers only,
 * bound param) — it's a robustness guard for a provider returning a degenerate vector, failing fast with
 * an actionable message instead.
 */
function toVectorLiteral(embedding: number[], dims: number): string {
  if (embedding.length !== dims) {
    throw new Error(
      `Embedding has ${embedding.length} dimensions, but code_embeddings requires ${dims}.`,
    );
  }
  for (let i = 0; i < embedding.length; i += 1) {
    if (!Number.isFinite(embedding[i])) {
      throw new Error(
        `Embedding contains a non-finite value (${String(embedding[i])}) at index ${i}; cannot serialize to a pgvector literal.`,
      );
    }
  }
  return `[${embedding.join(',')}]`;
}

/**
 * @description pgvector-backed implementation of the `@openthrottle/openthrottle-ide` engine's
 * {@link VectorStore} interface, persisting code-chunk vectors in the `code_embeddings` table
 * (databases/openthrottle/migrations 052, 164). Every operation is scoped by `workspaceRoot`. Uses raw SQL via the
 * injected TypeORM {@link DataSource} so the pgvector `<=>` operator and the HNSW index are used
 * directly (TypeORM has no first-class pgvector API) — the same approach as node-client's openthrottle-client.
 *
 * Rows carry the same provenance as the other embedding tables: `embedding_model`, `embedding_dims`,
 * and a `content_hash` of the exact text embedded. Search reads only rows whose model matches the
 * configured one; any other row is stale and the server's embeddings reconciler re-embeds it.
 */
@Injectable()
export class CodeVectorStore implements VectorStore {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CODE_EMBEDDER) private readonly embedder: CodeEmbedder,
  ) {}

  /**
   * Number of stored chunks for a workspace, embedded or not (drives ready vs not-indexed status).
   * A chunk still awaiting its vector is indexed: the reconciler fills the vector in.
   */
  async count(workspaceRoot: string): Promise<number> {
    const rows = await this.dataSource.query<{ count: string }[]>(
      'SELECT COUNT(*)::text AS count FROM code_embeddings WHERE workspace_root = $1',
      [workspaceRoot],
    );
    return Number(rows[0]?.count ?? 0);
  }

  /** Remove every stored chunk for a workspace (full re-index). */
  async clear(workspaceRoot: string): Promise<void> {
    await this.dataSource.query(
      'DELETE FROM code_embeddings WHERE workspace_root = $1',
      [workspaceRoot],
    );
  }

  /** Remove every chunk belonging to the given workspace-relative file paths. */
  async deleteByPaths(workspaceRoot: string, paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }
    await this.dataSource.query(
      'DELETE FROM code_embeddings WHERE workspace_root = $1 AND path = ANY($2)',
      [workspaceRoot, paths],
    );
  }

  /**
   * Return the `topK` chunks nearest to `embedding` for a workspace, each with a cosine similarity
   * mapped to `[0, 1]` (`1 - (embedding <=> query)`), highest-first. Only rows embedded by the
   * configured model are compared — a vector from another model is not in the same space.
   */
  async query(
    workspaceRoot: string,
    embedding: number[],
    topK: number,
  ): Promise<VectorMatch[]> {
    const config = this.requireConfig();
    const rows = await this.dataSource.query<CodeMatchRow[]>(
      `SELECT id, path, start_line, end_line, content,
              1 - (embedding <=> $1::vector) AS similarity
         FROM code_embeddings
        WHERE workspace_root = $2
          AND embedding IS NOT NULL
          AND embedding_model = $4
        ORDER BY embedding <=> $1::vector
        LIMIT $3`,
      [
        toVectorLiteral(embedding, config.dims),
        workspaceRoot,
        topK,
        config.model,
      ],
    );

    return rows.map((row) => ({
      chunk: {
        content: row.content,
        endLine: Number(row.end_line),
        id: row.id,
        path: row.path,
        startLine: Number(row.start_line),
      },
      score: Number(row.similarity),
    }));
  }

  /** Insert or replace chunks (keyed by `chunk.id`) for a workspace, batched. */
  async upsert(workspaceRoot: string, records: StoredChunk[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const config = this.requireConfig();

    for (let start = 0; start < records.length; start += UPSERT_BATCH_SIZE) {
      const batch = records.slice(start, start + UPSERT_BATCH_SIZE);
      const params: unknown[] = [];
      const valueTuples = batch.map(({ chunk, embedding }) => {
        // Embedding bound as a literal and cast with ::vector. content_hash hashes the exact
        // text the embedder embedded (task prefix + cap), as the reconciler recomputes it in SQL.
        params.push(
          chunk.id,
          workspaceRoot,
          chunk.path,
          chunk.startLine,
          chunk.endLine,
          chunk.content,
          hashContent(prepareEmbeddingInput(config, chunk.content, 'document')),
          toVectorLiteral(embedding, config.dims),
          config.model,
          embedding.length,
        );
        const base = params.length - UPSERT_COLUMNS;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::vector, $${base + 9}, $${base + 10})`;
      });

      // Batches run sequentially on purpose: bounds concurrent writes so a large
      // workspace re-index doesn't exhaust the pg connection pool.
      // eslint-disable-next-line no-await-in-loop -- sequential by design: bounds concurrent writes on the pg pool
      await this.dataSource.query(
        `INSERT INTO code_embeddings
           (id, workspace_root, path, start_line, end_line, content, content_hash, embedding,
            embedding_model, embedding_dims)
         VALUES ${valueTuples.join(', ')}
         ON CONFLICT (id) DO UPDATE SET
           workspace_root = EXCLUDED.workspace_root,
           path = EXCLUDED.path,
           start_line = EXCLUDED.start_line,
           end_line = EXCLUDED.end_line,
           content = EXCLUDED.content,
           content_hash = EXCLUDED.content_hash,
           embedding = EXCLUDED.embedding,
           embedding_model = EXCLUDED.embedding_model,
           embedding_dims = EXCLUDED.embedding_dims`,
        params,
      );
    }
  }

  /** The embedder's config; without one nothing can be embedded, so reaching here is a caller bug. */
  private requireConfig(): EmbeddingConfig {
    const config = this.embedder.getConfig();

    if (!config) {
      throw new Error(
        'Code embeddings are unavailable: the embedder is not configured.',
      );
    }

    return config;
  }
}
