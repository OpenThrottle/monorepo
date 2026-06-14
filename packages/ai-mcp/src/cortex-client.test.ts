import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Characterization tests for the semantic-search surface of cortex-client.
 *
 * The transport (TypeORM DataSource) and the embedding call are mocked, so these
 * exercise the client's own logic — result normalization/coercion, ranking-order
 * preservation, and empty/early-exit paths — without a network or live pgvector
 * instance. A real-DB test that asserts pgvector `<=>` ranking is the honest
 * follow-up (see the integration note at the bottom of this file).
 */

const { embedQuery, query } = vi.hoisted(() => ({
  embedQuery: vi.fn(),
  query: vi.fn(),
}));

vi.mock('./data-source.js', () => ({
  getOrCreateDataSource: vi.fn(async () => ({ query })),
  runQuery: vi.fn(),
}));

vi.mock('./embedding.js', () => ({
  embedQuery,
}));

const { getChunkById, runSemanticSearch, searchPlansBySemanticQuery } =
  await import('./cortex-client.js');

const EMBEDDING = Array.from({ length: 1536 }, () => 0);

beforeEach(() => {
  query.mockReset();
  embedQuery.mockReset();
});

describe('runSemanticSearch', () => {
  test('merges plan/task/documentation hits and ranks by descending similarity', async () => {
    // plan query, then task query, then documentation query (in that order).
    query
      .mockResolvedValueOnce([
        {
          content: 'plan chunk',
          id: 'p1',
          metadata: { kind: 'plan' },
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          similarity: '0.5',
        },
      ])
      .mockResolvedValueOnce([
        {
          content: 'task chunk',
          id: 't1',
          metadata: { kind: 'task' },
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          similarity: 0.9,
          task_id: 'task-1',
          task_title: 'Task One',
        },
      ])
      .mockResolvedValueOnce([
        {
          authors: ['octocat'],
          content: 'doc chunk',
          documentation_id: 'doc-1',
          id: 'd1',
          metadata: { kind: 'doc' },
          path: 'README.md',
          pr_number: 42,
          repo: 'openthrottle/monorepo',
          sha: 'abc123',
          similarity: '0.7',
        },
      ]);

    const result = await runSemanticSearch(EMBEDDING, 10);

    expect(result.map((chunk) => chunk.id)).toEqual(['t1', 'd1', 'p1']);
    expect(result.map((chunk) => chunk.source)).toEqual([
      'task',
      'documentation',
      'plan',
    ]);
    // similarity is coerced from the raw (string or number) pgvector value.
    expect(result.map((chunk) => chunk.similarity)).toEqual([0.9, 0.7, 0.5]);
    expect(result.every((chunk) => typeof chunk.similarity === 'number')).toBe(
      true,
    );
  });

  test('coerces null metadata to {} and non-array authors to []', async () => {
    query
      .mockResolvedValueOnce([
        {
          content: 'plan chunk',
          id: 'p1',
          metadata: null,
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          similarity: 0.4,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          authors: 'not-an-array',
          content: 'doc chunk',
          documentation_id: 'doc-1',
          id: 'd1',
          metadata: undefined,
          path: 'README.md',
          pr_number: null,
          repo: 'openthrottle/monorepo',
          sha: 'abc123',
          similarity: 0.8,
        },
      ]);

    const result = await runSemanticSearch(EMBEDDING, 10);

    const plan = result.find((chunk) => chunk.id === 'p1');
    const doc = result.find((chunk) => chunk.id === 'd1');
    expect(plan?.metadata).toEqual({});
    expect(doc?.metadata).toEqual({});
    expect(doc?.authors).toEqual([]);
    expect(doc?.prNumber).toBeNull();
  });

  test('caps the merged result at the requested limit', async () => {
    query
      .mockResolvedValueOnce([
        {
          content: 'a',
          id: 'p1',
          metadata: {},
          plan_id: 'x',
          plan_title: 'X',
          similarity: 0.1,
        },
        {
          content: 'b',
          id: 'p2',
          metadata: {},
          plan_id: 'y',
          plan_title: 'Y',
          similarity: 0.9,
        },
      ])
      .mockResolvedValueOnce([
        {
          content: 'c',
          id: 't1',
          metadata: {},
          plan_id: 'z',
          plan_title: 'Z',
          similarity: 0.5,
          task_id: 'task',
          task_title: 'T',
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await runSemanticSearch(EMBEDDING, 2);

    expect(result).toHaveLength(2);
    // highest-similarity two, in order.
    expect(result.map((chunk) => chunk.id)).toEqual(['p2', 't1']);
  });

  test('returns an empty array when every source is empty', async () => {
    query.mockResolvedValue([]);

    const result = await runSemanticSearch(EMBEDDING, 10);

    expect(result).toEqual([]);
  });

  test('normalizes pg-style { rows, rowCount } results as well as raw arrays', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            content: 'plan chunk',
            id: 'p1',
            metadata: {},
            plan_id: 'plan-1',
            plan_title: 'Plan One',
            similarity: 0.6,
          },
        ],
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await runSemanticSearch(EMBEDDING, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('p1');
  });
});

describe('getChunkById', () => {
  test('returns the plan chunk (similarity forced to 1) on a plan hit without querying other sources', async () => {
    query.mockResolvedValueOnce([
      {
        content: 'plan chunk',
        id: 'p1',
        metadata: { kind: 'plan' },
        plan_id: 'plan-1',
        plan_title: 'Plan One',
      },
    ]);

    const chunk = await getChunkById('p1');

    expect(chunk).toMatchObject({
      id: 'p1',
      similarity: 1,
      source: 'plan',
    });
    // plan hit short-circuits: task/doc queries are not run.
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('returns null when the id is not found in any source', async () => {
    query.mockResolvedValue([]);

    const chunk = await getChunkById('missing');

    expect(chunk).toBeNull();
    expect(query).toHaveBeenCalledTimes(3);
  });
});

describe('searchPlansBySemanticQuery', () => {
  test('returns an empty result without searching when the query cannot be embedded', async () => {
    embedQuery.mockResolvedValueOnce(null);

    const result = await searchPlansBySemanticQuery('anything');

    expect(result).toEqual({ plans: [], totalCount: 0 });
    expect(query).not.toHaveBeenCalled();
  });
});

/**
 * TODO(integration): a test that asserts pgvector cosine ranking (`embedding <=> $1`)
 * and the HNSW index path requires a live Postgres + pgvector instance with seeded
 * embeddings. Mocking ds.query here would only assert the mock, so that coverage is
 * intentionally deferred to a real-DB integration suite rather than faked.
 */
