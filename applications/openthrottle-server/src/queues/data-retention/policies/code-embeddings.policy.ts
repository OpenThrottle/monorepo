/**
 * @description Garbage collection for `code_embeddings` — the vector store behind
 * `/ide` code semantic search.
 *
 * By far the largest table audited: ~5.8k rows and ~120MB for just two workspace
 * roots, because each row carries a 1536-dimension vector plus the source chunk.
 * `@openthrottle/nestjs-vector-search` already deletes per (workspace_root, path)
 * when re-indexing a file, so a *live* root stays correct. What is missing is a
 * sweep for roots that are gone entirely — a deleted clone, a reaped worktree,
 * a checkout the user removed. Those roots' embeddings are unreachable and were
 * never cleaned up, and at ~20MB per thousand chunks they are the most expensive
 * dead weight in the schema.
 *
 * A root is collected only when BOTH conditions hold:
 *   1. OpenThrottle no longer knows about it — no `repository_checkouts` row has
 *      that filesystem path; and
 *   2. it has gone cold — its newest embedding is older than the idle window.
 *
 * THE CONJUNCTION IS THE SAFETY PROPERTY, and neither half is sufficient alone:
 *   - Absence alone is not enough. `/ide` code search can index an ad-hoc root
 *     that was never registered as a checkout, so deleting on absence alone would
 *     silently destroy a working index out from under an active session.
 *   - Coldness alone is not enough either. A registered checkout that simply has
 *     not changed in a month is perfectly live, and re-embedding 120MB of a large
 *     monorepo to recover from a needless delete is expensive.
 * Requiring both means the sweep only removes indexes that are BOTH unknown to
 * OpenThrottle AND idle.
 *
 * Paths are compared with trailing slashes trimmed. This matters because the
 * failure mode is asymmetric: a cosmetic `/repo` vs `/repo/` mismatch would make
 * a live root look unregistered and get it deleted, so matching is deliberately
 * generous in the direction that preserves data.
 *
 * `code_index_snapshots` is deliberately NOT used as the liveness signal, despite
 * being the obvious candidate. It was empty on the audited database while
 * `code_embeddings` held 5,760 rows, so absence of a snapshot says nothing about
 * whether a root is real.
 */

import type { DataSource } from 'typeorm';
import type { RetentionPolicy } from '../data-retention.types';

/** A root with no embedding newer than this is considered idle. */
const IDLE_DAYS = 30;

/**
 * Ids belonging to abandoned roots. The inner aggregate decides eligibility per
 * root; the outer select expands it to rows so the sweep can batch the delete.
 */
const ABANDONED_EMBEDDING_IDS = `
  SELECT ce.id
    FROM code_embeddings ce
   WHERE ce.workspace_root IN (
     SELECT grouped.workspace_root
       FROM code_embeddings grouped
      GROUP BY grouped.workspace_root
     HAVING max(grouped.created_at) < now() - make_interval(days => $1)
        AND NOT EXISTS (
          SELECT 1
            FROM repository_checkouts rc
           WHERE rtrim(rc.filesystem_path, '/') = rtrim(grouped.workspace_root, '/')
        )
   )
`;

export const codeEmbeddingsPolicy: RetentionPolicy = {
  countExpired: async (dataSource: DataSource): Promise<number> => {
    const rows: Array<{ count: string }> = await dataSource.query(
      `SELECT count(*)::text AS count FROM (${ABANDONED_EMBEDDING_IDS}) abandoned`,
      [IDLE_DAYS],
    );

    return Number(rows[0]?.count ?? 0);
  },

  deleteBatch: async (
    dataSource: DataSource,
    limit: number,
  ): Promise<number> => {
    const rows: Array<{ id: string }> = await dataSource.query(
      `DELETE FROM code_embeddings
        WHERE id IN (SELECT id FROM (${ABANDONED_EMBEDDING_IDS} LIMIT $2) batch)
        RETURNING id`,
      [IDLE_DAYS, limit],
    );

    return rows.length;
  },

  description: `delete embeddings for workspace roots that are both absent from repository_checkouts and idle for ${IDLE_DAYS} days`,

  name: 'code-embeddings',

  table: 'code_embeddings',
};
