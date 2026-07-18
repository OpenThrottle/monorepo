import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Characterization tests for the semantic-search surface of openthrottle-client.
 *
 * The transport (TypeORM DataSource) and the embedding call are mocked, so these
 * exercise the client's own logic — result normalization/coercion, ranking-order
 * preservation, and empty/early-exit paths — without a network or live pgvector
 * instance. A real-DB test that asserts pgvector `<=>` ranking is the honest
 * follow-up (see the integration note at the bottom of this file).
 */

const { embedQuery, query, runQuery } = vi.hoisted(() => ({
  embedQuery: vi.fn(),
  query: vi.fn(),
  runQuery: vi.fn(),
}));

vi.mock('./data-source.js', () => ({
  getOrCreateDataSource: vi.fn(async () => ({
    query,
    // Run the callback with a manager stub; runQuery is mocked, so the stub is never queried.
    transaction: (cb: (manager: { query: typeof query }) => unknown) =>
      cb({ query }),
  })),
  runQuery,
}));

vi.mock('./embedding.js', () => ({
  embedQuery,
}));

const {
  createCommitLink,
  getChunkById,
  getCommitLinksByPlanId,
  getCommitLinksByTaskId,
  runSemanticSearch,
  searchAgentAssets,
  searchPlansBySemanticQuery,
} = await import('./openthrottle-client.js');

const EMBEDDING = Array.from({ length: 1536 }, () => 0);

beforeEach(() => {
  query.mockReset();
  embedQuery.mockReset();
  runQuery.mockReset();
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

describe('searchAgentAssets', () => {
  const AGENT_EMBEDDING = Array.from({ length: 1536 }, () => 0);

  function row(
    overrides: Partial<{
      content: string;
      custom_prompt_id: string;
      id: string;
      labels: unknown;
      similarity: string | number;
    }>,
  ): Record<string, unknown> {
    return {
      content: 'chunk',
      custom_prompt_id: 'cp-1',
      description: null,
      file_path: null,
      id: 'e-1',
      labels: [],
      project_id: null,
      prompt_type: 'skills',
      similarity: '0.9',
      title: 'Asset',
      ...overrides,
    };
  }

  test('de-dupes by custom_prompt_id keeping the first (best-ranked) chunk per asset', async () => {
    // Rows arrive already ordered by the pgvector distance (best first). Two
    // chunks belong to cp-1; only the first should survive de-dup.
    query.mockResolvedValueOnce([
      row({ custom_prompt_id: 'cp-1', id: 'e-1a', similarity: '0.95' }),
      row({ custom_prompt_id: 'cp-1', id: 'e-1b', similarity: '0.80' }),
      row({ custom_prompt_id: 'cp-2', id: 'e-2', similarity: '0.70' }),
    ]);

    const result = await searchAgentAssets(AGENT_EMBEDDING, 10);

    expect(result.map((c) => c.customPromptId)).toEqual(['cp-1', 'cp-2']);
    expect(result.map((c) => c.id)).toEqual(['e-1a', 'e-2']);
    // similarity coerced to a number.
    expect(result[0]?.similarity).toBe(0.95);
    expect(result.every((c) => typeof c.similarity === 'number')).toBe(true);
  });

  test('stops collecting once the distinct-asset limit is reached', async () => {
    query.mockResolvedValueOnce([
      row({ custom_prompt_id: 'cp-1', id: 'e-1' }),
      row({ custom_prompt_id: 'cp-2', id: 'e-2' }),
      row({ custom_prompt_id: 'cp-3', id: 'e-3' }),
    ]);

    const result = await searchAgentAssets(AGENT_EMBEDDING, 2);

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.customPromptId)).toEqual(['cp-1', 'cp-2']);
  });

  test('normalizes pg-style { rows } results and coerces non-array labels to []', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [row({ custom_prompt_id: 'cp-1', labels: 'not-an-array' })],
    });

    const result = await searchAgentAssets(AGENT_EMBEDDING, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.labels).toEqual([]);
  });
});

describe('commit-link readers (work-ledger backed)', () => {
  test('getCommitLinksByPlanId reads work_artifacts, not commit_links, and maps rows', async () => {
    runQuery.mockResolvedValueOnce({
      rows: [
        {
          created_at: '2026-07-01T00:00:00.000Z',
          id: 'artifact-1',
          message: 'feat: x',
          plan_id: 'plan-1',
          repo: 'OpenThrottle/monorepo',
          sha: 'abc123',
          task_id: 'task-1',
        },
      ],
    });

    const result = await getCommitLinksByPlanId('plan-1');

    // Queries the ledger join, never the deprecated base table.
    const sql = String(runQuery.mock.calls[0]?.[1]);
    expect(sql).toContain('work_artifacts');
    expect(sql).toContain('work_session_subjects');
    expect(sql).toContain("wa.type = 'git_commit'");
    expect(sql).not.toContain('commit_links');
    expect(runQuery.mock.calls[0]?.[2]).toEqual(['plan-1']);
    // CommitLinkRow shape preserved (id is now the artifact uuid).
    expect(result).toEqual([
      {
        createdAt: '2026-07-01T00:00:00.000Z',
        id: 'artifact-1',
        message: 'feat: x',
        planId: 'plan-1',
        repo: 'OpenThrottle/monorepo',
        sha: 'abc123',
        taskId: 'task-1',
      },
    ]);
  });

  test('getCommitLinksByTaskId filters on the task subject via the ledger', async () => {
    runQuery.mockResolvedValueOnce({ rows: [] });

    await getCommitLinksByTaskId('task-9');

    const sql = String(runQuery.mock.calls[0]?.[1]);
    expect(sql).toContain('wss.task_id = $1');
    expect(sql).not.toContain('commit_links');
    expect(runQuery.mock.calls[0]?.[2]).toEqual(['task-9']);
  });
});

describe('createCommitLink (work-ledger backed)', () => {
  test('writes session + subject + git_commit artifact, never commit_links, and returns a CommitLinkRow', async () => {
    runQuery
      // 1. resolve the node-client service account
      .mockResolvedValueOnce({ rows: [{ id: 'sa-node-client' }] })
      // 2. create-or-reuse session (no rows consumed)
      .mockResolvedValueOnce({ rows: [] })
      // 3. select the session id
      .mockResolvedValueOnce({ rows: [{ id: 'sess-1' }] })
      // 4. ensure subject (no rows consumed)
      .mockResolvedValueOnce({ rows: [] })
      // 5. upsert the artifact, RETURNING the row
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'artifact-1',
            message: 'feat: x',
            produced_at: '2026-07-17T00:00:00.000Z',
          },
        ],
      });

    const result = await createCommitLink({
      message: 'feat: x',
      planId: 'plan-1',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
      taskId: 'task-1',
    });

    const sqls = runQuery.mock.calls.map((c) => String(c[1]));
    // Never touches the deprecated base table.
    expect(sqls.some((s) => s.includes('commit_links'))).toBe(false);
    // Writes the three ledger tables.
    expect(sqls.some((s) => s.includes('work_sessions'))).toBe(true);
    expect(sqls.some((s) => s.includes('work_session_subjects'))).toBe(true);
    const artifactSql = sqls.find((s) => s.includes('work_artifacts')) ?? '';
    // Idempotent create-or-promote; never regresses lifecycle/verification (not in the update set).
    expect(artifactSql).toContain(
      'ON CONFLICT (session_id, type, external_key)',
    );
    expect(artifactSql).toContain('DO UPDATE');
    expect(artifactSql).not.toContain('lifecycle = EXCLUDED');
    expect(artifactSql).not.toContain('verification = EXCLUDED');
    // CommitLinkRow shape preserved (id = artifact uuid).
    expect(result).toEqual({
      createdAt: '2026-07-17T00:00:00.000Z',
      id: 'artifact-1',
      message: 'feat: x',
      planId: 'plan-1',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
      taskId: 'task-1',
    });
  });

  test('throws loudly if the node-client service account is absent', async () => {
    runQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      createCommitLink({
        planId: 'plan-1',
        repo: 'OpenThrottle/monorepo',
        sha: 'abc123',
      }),
    ).rejects.toThrow('node-client');
  });
});

/**
 * TODO(integration): a test that asserts pgvector cosine ranking (`embedding <=> $1`)
 * and the HNSW index path requires a live Postgres + pgvector instance with seeded
 * embeddings. Mocking ds.query here would only assert the mock, so that coverage is
 * intentionally deferred to a real-DB integration suite rather than faked.
 */
