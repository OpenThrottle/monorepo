import { describe, expect, test } from 'vitest';

import { EMBEDDING_SOURCES } from '../embeddings/embeddings.constants.ts';
import {
  buildPruneOrphansSql,
  buildStaleRowsSql,
  resolveEmbeddingsReconcileConfig,
} from './embeddings-reconcile.utils.ts';

describe('resolveEmbeddingsReconcileConfig', () => {
  test('defaults to every 15 minutes in batches of 100', () => {
    expect(resolveEmbeddingsReconcileConfig({})).toEqual({
      batchSize: 100,
      intervalMinutes: 15,
    });
  });

  test('reads positive integers from env', () => {
    expect(
      resolveEmbeddingsReconcileConfig({
        EMBEDDINGS_RECONCILE_BATCH_SIZE: '25',
        EMBEDDINGS_RECONCILE_INTERVAL_MINUTES: '5',
      }),
    ).toEqual({ batchSize: 25, intervalMinutes: 5 });
  });

  test.each(['0', '-3', '1.5', 'soon'])('falls back on %s', (raw) => {
    expect(
      resolveEmbeddingsReconcileConfig({
        EMBEDDINGS_RECONCILE_BATCH_SIZE: raw,
        EMBEDDINGS_RECONCILE_INTERVAL_MINUTES: raw,
      }),
    ).toEqual({ batchSize: 100, intervalMinutes: 15 });
  });
});

describe('buildStaleRowsSql', () => {
  const sql = buildStaleRowsSql(EMBEDDING_SOURCES.task);

  test('selects rows with no embedding row', () => {
    expect(sql).toContain('LEFT JOIN task_embeddings e ON e.task_id = s.id');
    expect(sql).toContain('e.task_id IS NULL');
  });

  test('selects rows embedded by a NULL or different model', () => {
    expect(sql).toContain('e.embedding_model IS DISTINCT FROM $3');
  });

  test('selects rows whose text no longer hashes to the stored content_hash', () => {
    expect(sql).toContain(
      `e.content_hash IS DISTINCT FROM encode(sha256(convert_to(left($1 || ${EMBEDDING_SOURCES.task.contentSql}, $2), 'UTF8')), 'hex')`,
    );
  });

  test('pages by keyset and bounds the page size', () => {
    expect(sql).toContain('s.id > $4::uuid');
    expect(sql).toMatch(/ORDER BY s\.id\s+LIMIT \$5$/);
  });

  test("applies the entity's source filter", () => {
    expect(buildStaleRowsSql(EMBEDDING_SOURCES.custom_prompt)).toContain(
      '(s.deleted_at IS NULL)',
    );
  });

  test('never selects a soft-deleted plan', () => {
    expect(buildStaleRowsSql(EMBEDDING_SOURCES.plan)).toContain(
      'WHERE (s.deleted_at IS NULL)',
    );
  });

  test('never selects a soft-deleted task, nor a task of a soft-deleted plan', () => {
    expect(sql).toContain('FROM tasks s LEFT JOIN plans p ON p.id = s.plan_id');
    expect(sql).toContain(
      'WHERE (s.deleted_at IS NULL AND p.deleted_at IS NULL)',
    );
  });
});

describe('buildPruneOrphansSql', () => {
  test('deletes vectors whose source no longer qualifies', () => {
    const sql = buildPruneOrphansSql(EMBEDDING_SOURCES.custom_prompt);

    expect(sql).toContain('DELETE FROM custom_prompt_embeddings e');
    expect(sql).toContain(
      'WHERE s.id = e.custom_prompt_id AND (s.deleted_at IS NULL)',
    );
  });

  test.each([
    ['plan', 'plan_id'],
    ['task', 'task_id'],
  ] as const)(
    'keeps the vectors of a soft-deleted %s (only a vanished row is pruned)',
    (entity, fkColumn) => {
      const sql = buildPruneOrphansSql(EMBEDDING_SOURCES[entity]);

      expect(sql).toContain(`WHERE s.id = e.${fkColumn} AND (TRUE)`);
      expect(sql).not.toContain('deleted_at');
    },
  );
});
