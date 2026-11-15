import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Characterization tests for the semantic-search surface of openthrottle-client.
 *
 * The transport (TypeORM DataSource) is mocked, so these
 * exercise the client's own logic — result normalization/coercion, ranking-order
 * preservation, and empty/early-exit paths — without a network or live pgvector
 * instance. A real-DB test that asserts pgvector `<=>` ranking is the honest
 * follow-up (see the integration note at the bottom of this file).
 */

const { query, runQuery } = vi.hoisted(() => ({
  query: vi.fn(),
  runQuery: vi.fn(),
}));

vi.mock('../data-source.js', () => ({
  getOrCreateDataSource: vi.fn(async () => ({
    query,
    // Run the callback with a manager stub; runQuery is mocked, so the stub is never queried.
    transaction: (cb: (manager: { query: typeof query }) => unknown) =>
      cb({ query }),
  })),
  runQuery,
}));

const {
  createCommitLink,
  getChunkById,
  getCommitLinksByPlanId,
  getCommitLinksByTaskId,
  runLexicalSearch,
  runSemanticSearch,
  searchAgentAssets,
  searchAgentAssetsLexically,
  searchPlansBySemanticQuery,
} = await import('../openthrottle-client.js');

const EMBEDDING = Array.from({ length: 768 }, () => 0);
const MODEL = 'nomic-embed-text-v1.5';

beforeEach(() => {
  query.mockReset();
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

    const result = await runSemanticSearch(EMBEDDING, 10, MODEL);

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

    const result = await runSemanticSearch(EMBEDDING, 10, MODEL);

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

    const result = await runSemanticSearch(EMBEDDING, 2, MODEL);

    expect(result).toHaveLength(2);
    // highest-similarity two, in order.
    expect(result.map((chunk) => chunk.id)).toEqual(['p2', 't1']);
  });

  test('returns an empty array when every source is empty', async () => {
    query.mockResolvedValue([]);

    const result = await runSemanticSearch(EMBEDDING, 10, MODEL);

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

    const result = await runSemanticSearch(EMBEDDING, 10, MODEL);

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
    // three embedding tables, then the source-row fallback lexical results resolve through
    expect(query).toHaveBeenCalledTimes(4);
  });

  test('resolves a source-row id from a lexical result', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          content: 'Plan body',
          id: 'plan-1',
          plan_id: 'plan-1',
          plan_title: 'Plan One',
          rank: 1,
          source: 'plan',
        },
      ]);

    const chunk = await getChunkById('plan-1');

    expect(chunk).toMatchObject({
      id: 'plan-1',
      planId: 'plan-1',
      source: 'plan',
    });
  });
});

describe('runSemanticSearch model filter', () => {
  test('compares only vectors written by the configured model', async () => {
    query.mockResolvedValue([]);

    await runSemanticSearch(EMBEDDING, 5, MODEL);

    expect(query).toHaveBeenCalledTimes(3);
    for (const call of query.mock.calls) {
      expect(call[0]).toMatch(/WHERE \w+\.embedding_model = \$3/);
      expect(call[1]).toEqual([expect.any(String), 5, MODEL]);
    }
  });
});

describe('runLexicalSearch', () => {
  test('ranks full-text matches and maps documentation and task rows', async () => {
    query.mockResolvedValueOnce([
      {
        authors: ['octocat'],
        content: 'doc body',
        id: 'doc-1',
        path: 'docs/a.md',
        rank: '0.6',
        repo: 'o/r',
        sha: 'abc',
        source: 'documentation',
      },
      {
        content: 'task body',
        id: 'task-1',
        plan_id: 'plan-1',
        plan_title: 'Plan One',
        rank: 0.2,
        source: 'task',
        task_id: 'task-1',
        task_title: 'Task One',
      },
    ]);

    const chunks = await runLexicalSearch('embeddings backfill', 10);

    expect(query.mock.calls[0]?.[0]).toContain(
      "websearch_to_tsquery('english', $1)",
    );
    expect(query.mock.calls[0]?.[1]).toEqual(['embeddings backfill', 10]);
    expect(chunks).toEqual([
      expect.objectContaining({
        documentationId: 'doc-1',
        path: 'docs/a.md',
        similarity: 0.6,
        source: 'documentation',
      }),
      expect.objectContaining({
        planTitle: 'Plan One',
        similarity: 0.2,
        source: 'task',
        taskId: 'task-1',
      }),
    ]);
  });
});

describe('searchAgentAssetsLexically', () => {
  test('applies prompt-type and project filters', async () => {
    query.mockResolvedValueOnce([]);

    await searchAgentAssetsLexically('commit', 5, ['skills'], 'project-1');

    const [sql, params] = query.mock.calls[0] ?? [];

    expect(sql).toContain('cp.prompt_type = ANY($2)');
    expect(sql).toContain('cp.project_id = $3');
    expect(params).toEqual(['commit', ['skills'], 'project-1', 5]);
  });
});

describe('searchPlansBySemanticQuery', () => {
  test('returns an empty result when no chunk carries a plan', async () => {
    query.mockResolvedValue([]);

    const result = await searchPlansBySemanticQuery(EMBEDDING, 20, MODEL);

    expect(result).toEqual({ plans: [], totalCount: 0 });
  });
});

describe('searchAgentAssets', () => {
  const AGENT_EMBEDDING = Array.from({ length: 768 }, () => 0);

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

    const result = await searchAgentAssets(
      AGENT_EMBEDDING,
      10,
      undefined,
      undefined,
      MODEL,
    );

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

    const result = await searchAgentAssets(
      AGENT_EMBEDDING,
      2,
      undefined,
      undefined,
      MODEL,
    );

    expect(result).toHaveLength(2);
    expect(result.map((c) => c.customPromptId)).toEqual(['cp-1', 'cp-2']);
  });

  test('normalizes pg-style { rows } results and coerces non-array labels to []', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [row({ custom_prompt_id: 'cp-1', labels: 'not-an-array' })],
    });

    const result = await searchAgentAssets(
      AGENT_EMBEDDING,
      10,
      undefined,
      undefined,
      MODEL,
    );

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
