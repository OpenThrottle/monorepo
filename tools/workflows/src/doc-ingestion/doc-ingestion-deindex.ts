/**
 * @description De-index documentation by path: deletes rows from documentation (and CASCADE documentation_embeddings) for the given repo and paths.
 * Used by the doc-ingestion BullMQ job for to-remove paths. See docs/openthrottle/doc-ingestion-job-spec.md.
 */

import { Client } from 'pg';

export interface DeindexDocumentationByPathOptions {
  readonly connectionString: string;
  readonly paths: readonly string[];
  readonly repo: string;
}

/**
 * @description Deletes documentation rows (and their embeddings via FK CASCADE) for the given repo and paths.
 * No-op when paths is empty.
 */
export async function deindexDocumentationByPath(
  options: DeindexDocumentationByPathOptions,
): Promise<number> {
  const { connectionString, paths, repo } = options;
  if (paths.length === 0) return 0;

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(
      `DELETE FROM documentation WHERE repo = $1 AND path = ANY($2::text[])`,
      [repo, [...paths]],
    );
    return result.rowCount ?? 0;
  } finally {
    await client.end();
  }
}
