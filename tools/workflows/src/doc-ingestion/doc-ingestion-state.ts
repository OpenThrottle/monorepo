/**
 * @description Prior-state storage for diff-based doc ingestion. Read/write and lookup by (scope, path).
 * State is stored in Cortex Postgres table doc_ingestion_state (scope, path, content_hash, updated_at).
 * See docs/openthrottle/doc-ingestion-job-spec.md and migration 030_create_doc_ingestion_state_table.sql.
 */

import { Client } from 'pg';
import { getPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';

export interface DocIngestionStateEntry {
  readonly contentHash: string;
  readonly updatedAt: Date;
}

/**
 * @description Returns prior state for a scope: path -> { contentHash, updatedAt }. Empty Map if scope has no rows.
 */
export async function getPriorState(
  connectionString: string,
  scope: string,
): Promise<Map<string, DocIngestionStateEntry>> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query<{
      path: string;
      content_hash: string;
      updated_at: Date;
    }>(
      `SELECT path, content_hash, updated_at
       FROM doc_ingestion_state
       WHERE scope = $1`,
      [scope],
    );
    const map = new Map<string, DocIngestionStateEntry>();
    for (const row of result.rows) {
      map.set(row.path, {
        contentHash: row.content_hash,
        updatedAt: row.updated_at,
      });
    }
    return map;
  } finally {
    await client.end();
  }
}

/**
 * @description Upserts prior state for the given scope and entries. Idempotent per (scope, path).
 */
export async function savePriorState(
  connectionString: string,
  scope: string,
  entries: readonly { readonly path: string; readonly contentHash: string }[],
): Promise<void> {
  if (entries.length === 0) return;

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const paths = entries.map((e) => e.path);
    const hashes = entries.map((e) => e.contentHash);
    await client.query(
      `INSERT INTO doc_ingestion_state (scope, path, content_hash, updated_at)
       SELECT $1::text, p, h, NOW()
       FROM unnest($2::text[], $3::text[]) AS t(p, h)
       ON CONFLICT (scope, path)
       DO UPDATE SET content_hash = EXCLUDED.content_hash, updated_at = NOW()`,
      [scope, paths, hashes],
    );
  } finally {
    await client.end();
  }
}

/**
 * @description Removes prior state for the given scope and paths. No-op for paths not present.
 */
export async function removePriorState(
  connectionString: string,
  scope: string,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `DELETE FROM doc_ingestion_state WHERE scope = $1 AND path = ANY($2::text[])`,
      [scope, paths],
    );
  } finally {
    await client.end();
  }
}

/**
 * @description Returns the content hash for (scope, path), or undefined if not stored.
 */
export async function getPriorStateEntry(
  connectionString: string,
  scope: string,
  path: string,
): Promise<DocIngestionStateEntry | undefined> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query<{
      content_hash: string;
      updated_at: Date;
    }>(
      `SELECT content_hash, updated_at
       FROM doc_ingestion_state
       WHERE scope = $1 AND path = $2`,
      [scope, path],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      contentHash: row.content_hash,
      updatedAt: row.updated_at,
    };
  } finally {
    await client.end();
  }
}

/**
 * @description Returns a connection string from Cortex config or undefined if not configured.
 * Convenience for callers that need to pass connectionString into getPriorState/savePriorState/removePriorState/getPriorStateEntry.
 */
export function getDocIngestionStateConnectionString(): string | undefined {
  const config = getPostgresConfig();
  return config?.connectionString;
}
