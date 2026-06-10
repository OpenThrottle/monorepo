import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { hashContent } from '@openthrottle/openthrottle-ide';
import type {
  StoredChunk,
  VectorMatch,
  VectorStore,
} from '@openthrottle/openthrottle-ide';
import { DataSource } from 'typeorm';

/** Rows upserted per INSERT statement (8 columns/row; well under pg's parameter cap). */
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
 */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * @description pgvector-backed implementation of the `@openthrottle/openthrottle-ide` engine's
 * {@link VectorStore} interface, persisting code-chunk vectors in the `code_embeddings` table
 * (databases/migrations 052). Every operation is scoped by `workspaceRoot`. Uses raw SQL via the
 * injected TypeORM {@link DataSource} so the pgvector `<=>` operator and the HNSW index are used
 * directly (TypeORM has no first-class pgvector API) — the same approach as ai-mcp's cortex-client.
 */
@Injectable()
export class CodeVectorStore implements VectorStore {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

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
   * mapped to `[0, 1]` (`1 - (embedding <=> query)`), highest-first.
   */
  async query(
    workspaceRoot: string,
    embedding: number[],
    topK: number,
  ): Promise<VectorMatch[]> {
    const rows = await this.dataSource.query<CodeMatchRow[]>(
      `SELECT id, path, start_line, end_line, content,
              1 - (embedding <=> $1::vector) AS similarity
         FROM code_embeddings
        WHERE workspace_root = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3`,
      [toVectorLiteral(embedding), workspaceRoot, topK],
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

    for (let start = 0; start < records.length; start += UPSERT_BATCH_SIZE) {
      const batch = records.slice(start, start + UPSERT_BATCH_SIZE);
      const params: unknown[] = [];
      const valueTuples = batch.map(({ chunk, embedding }) => {
        // 8 columns per row; embedding bound as a literal and cast with ::vector.
        params.push(
          chunk.id,
          workspaceRoot,
          chunk.path,
          chunk.startLine,
          chunk.endLine,
          chunk.content,
          hashContent(chunk.content),
          toVectorLiteral(embedding),
        );
        const base = params.length - 8;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::vector)`;
      });

      // Batches run sequentially on purpose: bounds concurrent writes so a large
      // workspace re-index doesn't exhaust the pg connection pool.
      // eslint-disable-next-line no-await-in-loop
      await this.dataSource.query(
        `INSERT INTO code_embeddings
           (id, workspace_root, path, start_line, end_line, content, content_hash, embedding)
         VALUES ${valueTuples.join(', ')}
         ON CONFLICT (id) DO UPDATE SET
           workspace_root = EXCLUDED.workspace_root,
           path = EXCLUDED.path,
           start_line = EXCLUDED.start_line,
           end_line = EXCLUDED.end_line,
           content = EXCLUDED.content,
           content_hash = EXCLUDED.content_hash,
           embedding = EXCLUDED.embedding`,
        params,
      );
    }
  }
}
