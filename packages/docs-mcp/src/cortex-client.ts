/**
 * @description Runs vector similarity search over documentation_embeddings in Cortex Postgres.
 */

import pg from 'pg';
import type { CortexPostgresConfig } from './config.js';

export interface DocumentationSearchChunk {
  readonly authors: readonly unknown[];
  readonly content: string;
  readonly id: string;
  readonly metadata: Record<string, unknown>;
  readonly path: string;
  readonly prNumber: number | null;
  readonly repo: string;
  readonly sha: string;
  readonly similarity: number;
}

/**
 * @description Runs cosine-similarity search over documentation_embeddings, joins documentation for path/sha/PR/authors.
 * @param config Cortex Postgres connection config.
 * @param embedding 1536-dim query embedding.
 * @param limit Max number of chunks to return.
 */
export async function runDocumentationSemanticSearch(
  config: CortexPostgresConfig,
  embedding: number[],
  limit: number,
): Promise<DocumentationSearchChunk[]> {
  const vectorStr = `[${embedding.join(',')}]`;
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();

  try {
    const rows = await client.query<{
      id: string;
      content: string;
      metadata: unknown;
      documentation_id: string;
      path: string;
      repo: string;
      sha: string;
      pr_number: number | null;
      authors: unknown;
      similarity: string;
    }>(
      `SELECT de.id, de.content, de.metadata, de.documentation_id,
              d.path, d.repo, d.sha, d.pr_number, d.authors,
              1 - (de.embedding <=> $1::vector) AS similarity
       FROM documentation_embeddings de
       JOIN documentation d ON de.documentation_id = d.id
       ORDER BY de.embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );

    return rows.rows.map((r) => ({
      authors: Array.isArray(r.authors) ? r.authors : [],
      content: r.content,
      id: r.id,
      // FIXME: Swap out eventually
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      path: r.path,
      prNumber: r.pr_number,
      repo: r.repo,
      sha: r.sha,
      similarity: Number(r.similarity),
    }));
  } finally {
    await client.end();
  }
}

/**
 * @description Fetches a single documentation chunk by id (UUID from documentation_embeddings).
 * @param config Cortex Postgres connection config.
 * @param id UUID of the chunk.
 * @returns The chunk or null if not found.
 */
export async function getDocumentationChunkById(
  config: CortexPostgresConfig,
  id: string,
): Promise<DocumentationSearchChunk | null> {
  const client = new pg.Client({ connectionString: config.connectionString });
  await client.connect();

  try {
    const res = await client.query<{
      id: string;
      content: string;
      metadata: unknown;
      path: string;
      repo: string;
      sha: string;
      pr_number: number | null;
      authors: unknown;
    }>(
      `SELECT de.id, de.content, de.metadata, d.path, d.repo, d.sha, d.pr_number, d.authors
       FROM documentation_embeddings de
       JOIN documentation d ON de.documentation_id = d.id
       WHERE de.id = $1`,
      [id],
    );

    const r = res.rows[0];
    if (!r) return null;

    return {
      authors: Array.isArray(r.authors) ? r.authors : [],
      content: r.content,
      id: r.id,
      // FIXME: Swap out eventually
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      path: r.path,
      prNumber: r.pr_number,
      repo: r.repo,
      sha: r.sha,
      similarity: 1,
    };
  } finally {
    await client.end();
  }
}
