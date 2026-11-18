/**
 * @description Config and SQL builders for the embeddings reconciler (OT plan 165e86ef).
 */

import { CODE_EMBEDDINGS_TABLE } from '../embeddings/embeddings.constants.ts';
import type { EmbeddingSource } from '../embeddings/embeddings.types.ts';
import {
  codeContentHashSql,
  contentHashSql,
} from '../embeddings/embeddings.utils.ts';
import {
  DEFAULT_EMBEDDINGS_RECONCILE_BATCH_SIZE,
  DEFAULT_EMBEDDINGS_RECONCILE_INTERVAL_MINUTES,
} from './embeddings-reconcile.constants.ts';
import type { EmbeddingsReconcileConfig } from './embeddings-reconcile.types.ts';

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw?.trim());

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * @description Reads `EMBEDDINGS_RECONCILE_INTERVAL_MINUTES` (default 15) and
 * `EMBEDDINGS_RECONCILE_BATCH_SIZE` (default 100); anything not a positive integer falls back.
 */
export function resolveEmbeddingsReconcileConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmbeddingsReconcileConfig {
  return {
    batchSize: readPositiveInt(
      env.EMBEDDINGS_RECONCILE_BATCH_SIZE,
      DEFAULT_EMBEDDINGS_RECONCILE_BATCH_SIZE,
    ),
    intervalMinutes: readPositiveInt(
      env.EMBEDDINGS_RECONCILE_INTERVAL_MINUTES,
      DEFAULT_EMBEDDINGS_RECONCILE_INTERVAL_MINUTES,
    ),
  };
}

/**
 * @description One keyset page of source rows that need embedding: no embedding row, a NULL
 * or different `embedding_model`, or a `content_hash` that no longer matches the text the
 * processor would embed. Rows with no text are skipped (the processor would only remove them).
 *
 * Parameters: `$1` document prefix, `$2` input cap, `$3` configured model, `$4` last id seen,
 * `$5` page size.
 */
export function buildStaleRowsSql(source: EmbeddingSource): string {
  return `SELECT s.id
    FROM ${source.fromSql}
    LEFT JOIN ${source.embeddingTable} e ON e.${source.fkColumn} = s.id
   WHERE (${source.whereSql})
     AND s.id > $4::uuid
     AND btrim(${source.contentSql}, E' \\t\\n\\r') <> ''
     AND (
       e.${source.fkColumn} IS NULL
       OR e.embedding_model IS DISTINCT FROM $3
       OR e.content_hash IS DISTINCT FROM ${contentHashSql(source, '$1', '$2')}
     )
   ORDER BY s.id
   LIMIT $5`;
}

/**
 * @description Deletes embedding rows whose source no longer qualifies for
 * {@link EmbeddingSource.pruneWhereSql} — soft-deleted prompts and superseded documentation
 * versions. Soft-deleted plans and tasks keep their vectors: their prune filter is wide open, and
 * search never returns them (it joins the live plan or task). (Hard deletes already cascade.)
 */
export function buildPruneOrphansSql(source: EmbeddingSource): string {
  return `DELETE FROM ${source.embeddingTable} e
   WHERE NOT EXISTS (
     SELECT 1 FROM ${source.fromSql}
      WHERE s.id = e.${source.fkColumn} AND (${source.pruneWhereSql})
   )`;
}

/**
 * @description One keyset page of code chunks that need embedding (OT plan e489d73d): no vector,
 * a NULL or different `embedding_model`, or a `content_hash` that does not match the row's own
 * `content`. Chunk ids are TEXT, so the walk starts after `''`.
 *
 * Parameters: `$1` document prefix, `$2` input cap, `$3` configured model, `$4` last id seen,
 * `$5` page size.
 */
export function buildStaleCodeChunksSql(): string {
  return `SELECT c.id
    FROM ${CODE_EMBEDDINGS_TABLE} c
   WHERE c.id > $4
     AND btrim(c.content, E' \\t\\n\\r') <> ''
     AND (
       c.embedding IS NULL
       OR c.embedding_model IS DISTINCT FROM $3
       OR c.content_hash IS DISTINCT FROM ${codeContentHashSql('$1', '$2')}
     )
   ORDER BY c.id
   LIMIT $5`;
}
