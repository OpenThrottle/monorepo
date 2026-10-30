/**
 * Token-usage persistence: row mapping, the batch POST, the server → JSONL
 * fallback, dead-lettering, and the batched drain that delivers a buffer later.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HookFetch, TokenUsageRecord } from '../../index.ts';
import {
  deadLetterPathFor,
  defaultTokenUsageJsonlPath,
  drainBufferedUsage,
  MAX_TOKEN_USAGE_BATCH,
  persistTokenUsage,
  postTokenUsageBatch,
  toRecordTokenUsageRow,
} from '../../index.ts';

const URL = 'http://example.test/graphql';

const makeRecord = (n: number): TokenUsageRecord => ({
  cache_read_tokens: null,
  cache_write_tokens: 3,
  cost_usd: 0.25,
  cwd: '/work',
  git_branch: 'main',
  input_tokens: 10,
  model: 'model-x',
  occurred_at: '2026-10-29T10:00:00.000Z',
  output_tokens: 20,
  provider: 'provider-x',
  raw_usage_json: '{"a":1}',
  reasoning_tokens: null,
  request_id: `req-${n}`,
  session_id: 'sess-1',
  source: 'test-source',
  total_tokens: 33,
});

const makeRecords = (count: number): TokenUsageRecord[] =>
  Array.from({ length: count }, (_, index) => makeRecord(index));

interface FakeServer {
  readonly calls: Array<{ rows: number }>;
  readonly fetchImpl: HookFetch;
}

/** A fetch that answers each call from `respond`, recording row counts. */
const fakeServer = (
  respond: (
    call: number,
    rows: number,
  ) => { body: unknown; status?: number } | Error,
): FakeServer => {
  const calls: Array<{ rows: number }> = [];
  const fetchImpl: HookFetch = async (_url, init) => {
    const parsed: unknown = JSON.parse(init.body);
    const rows =
      typeof parsed === 'object' &&
      parsed !== null &&
      'variables' in parsed &&
      typeof parsed.variables === 'object' &&
      parsed.variables !== null &&
      'input' in parsed.variables &&
      typeof parsed.variables.input === 'object' &&
      parsed.variables.input !== null &&
      'rows' in parsed.variables.input &&
      Array.isArray(parsed.variables.input.rows)
        ? parsed.variables.input.rows.length
        : -1;
    calls.push({ rows });
    const answer = respond(calls.length, rows);
    if (answer instanceof Error) {
      throw answer;
    }
    const status = answer.status ?? 200;
    return { json: async () => answer.body, ok: status < 400, status };
  };
  return { calls, fetchImpl };
};

const accepted = (rows: number) => ({
  body: { data: { recordTokenUsage: { inserted: rows, skipped: 0 } } },
});

const rejected = {
  body: {
    data: null,
    errors: [
      {
        extensions: { code: 'BAD_REQUEST' },
        message: 'row 3: model must not be blank',
      },
    ],
  },
};

const readLines = (filePath: string): unknown[] =>
  fs.existsSync(filePath)
    ? fs
        .readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line): unknown => JSON.parse(line))
    : [];

describe('token usage', () => {
  let tmpRoot: string;
  let repoRoot: string;
  let telemetryDir: string;
  let prevDir: string | undefined;
  let prevOffline: string | undefined;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'token-usage-'));
    repoRoot = path.join(tmpRoot, 'repo');
    telemetryDir = path.join(tmpRoot, 'telemetry');
    fs.mkdirSync(repoRoot);
    prevDir = process.env.OPENTHROTTLE_TELEMETRY_DIR;
    prevOffline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    process.env.OPENTHROTTLE_TELEMETRY_DIR = telemetryDir;
    delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    if (prevDir === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_DIR;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_DIR = prevDir;
    }
    if (prevOffline === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = prevOffline;
    }
  });

  const persist = (
    records: readonly TokenUsageRecord[],
    fetchImpl: HookFetch,
  ) =>
    persistTokenUsage({
      authToken: 'tok',
      fetchImpl,
      graphqlUrl: URL,
      records,
      repoRoot,
      timeoutMs: 200,
    });

  describe('toRecordTokenUsageRow', () => {
    it('maps every snake_case field to its camelCase GraphQL key', () => {
      expect(toRecordTokenUsageRow(makeRecord(1))).toEqual({
        cacheReadTokens: null,
        cacheWriteTokens: 3,
        costUsd: 0.25,
        cwd: '/work',
        gitBranch: 'main',
        inputTokens: 10,
        model: 'model-x',
        occurredAt: '2026-10-29T10:00:00.000Z',
        outputTokens: 20,
        provider: 'provider-x',
        rawUsageJson: '{"a":1}',
        reasoningTokens: null,
        requestId: 'req-1',
        sessionId: 'sess-1',
        source: 'test-source',
        totalTokens: 33,
      });
    });
  });

  describe('postTokenUsageBatch', () => {
    it('returns the counts the server reports', async () => {
      const server = fakeServer(() => ({
        body: { data: { recordTokenUsage: { inserted: 2, skipped: 1 } } },
      }));
      await expect(
        postTokenUsageBatch({
          authToken: 'tok',
          fetchImpl: server.fetchImpl,
          graphqlUrl: URL,
          records: makeRecords(3),
          timeoutMs: 200,
        }),
      ).resolves.toEqual({ inserted: 2, ok: true, skipped: 1 });
    });

    it('refuses an oversized batch as permanent without posting', async () => {
      const server = fakeServer((_call, rows) => accepted(rows));
      const res = await postTokenUsageBatch({
        fetchImpl: server.fetchImpl,
        graphqlUrl: URL,
        records: makeRecords(MAX_TOKEN_USAGE_BATCH + 1),
        timeoutMs: 200,
      });
      expect(res).toMatchObject({ ok: false, permanent: true });
      expect(server.calls).toEqual([]);
    });

    it('treats a result without counts as transient', async () => {
      const server = fakeServer(() => ({
        body: { data: { recordTokenUsage: {} } },
      }));
      await expect(
        postTokenUsageBatch({
          fetchImpl: server.fetchImpl,
          graphqlUrl: URL,
          records: makeRecords(1),
          timeoutMs: 200,
        }),
      ).resolves.toMatchObject({ ok: false, permanent: false });
    });
  });

  describe('persistTokenUsage', () => {
    it('sends records in batches of at most 500', async () => {
      const server = fakeServer((_call, rows) => accepted(rows));
      const res = await persist(makeRecords(1200), server.fetchImpl);

      expect(server.calls.map((call) => call.rows)).toEqual([500, 500, 200]);
      expect(res).toEqual({
        buffered: 0,
        deadLettered: 0,
        detail: null,
        inserted: 1200,
        skipped: 0,
      });
      expect(fs.existsSync(defaultTokenUsageJsonlPath())).toBe(false);
    });

    it('buffers everything to its own file when the server is down, after one attempt', async () => {
      const server = fakeServer(() => new Error('ECONNREFUSED'));
      const records = makeRecords(1200);
      const res = await persist(records, server.fetchImpl);

      expect(server.calls).toHaveLength(1);
      expect(res).toMatchObject({
        buffered: 1200,
        deadLettered: 0,
        detail: 'ECONNREFUSED',
        inserted: 0,
      });
      expect(defaultTokenUsageJsonlPath()).toBe(
        path.join(telemetryDir, 'token-usage.jsonl'),
      );
      expect(readLines(defaultTokenUsageJsonlPath())).toEqual(records);
    });

    it('buffers only the unsent batches after a mid-run transient failure', async () => {
      const server = fakeServer((call, rows) =>
        call === 1 ? accepted(rows) : new Error('timeout'),
      );
      const res = await persist(makeRecords(1200), server.fetchImpl);

      expect(server.calls).toHaveLength(2);
      expect(res).toMatchObject({ buffered: 700, inserted: 500 });
      expect(readLines(defaultTokenUsageJsonlPath())).toHaveLength(700);
    });

    it('buffers when OPENTHROTTLE_TELEMETRY_OFFLINE=1', async () => {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = '1';
      const server = fakeServer((_call, rows) => accepted(rows));
      const res = await persist(makeRecords(2), server.fetchImpl);

      expect(server.calls).toEqual([]);
      expect(res).toMatchObject({ buffered: 2 });
    });

    it('does nothing for an empty list', async () => {
      const server = fakeServer((_call, rows) => accepted(rows));
      await persist([], server.fetchImpl);
      expect(server.calls).toEqual([]);
      expect(fs.existsSync(telemetryDir)).toBe(false);
    });

    describe('when the server rejects a batch permanently', () => {
      it('dead-letters that batch directly and still tries the next', async () => {
        const server = fakeServer((call, rows) =>
          call === 1 ? rejected : accepted(rows),
        );
        const res = await persist(makeRecords(600), server.fetchImpl);

        expect(server.calls.map((call) => call.rows)).toEqual([500, 100]);
        expect(res).toMatchObject({
          buffered: 0,
          deadLettered: 500,
          detail: 'row 3: model must not be blank',
          inserted: 100,
        });
        expect(fs.existsSync(defaultTokenUsageJsonlPath())).toBe(false);

        const dead = readLines(deadLetterPathFor(defaultTokenUsageJsonlPath()));
        expect(dead).toHaveLength(500);
        expect(dead[0]).toMatchObject({
          line: { request_id: 'req-0' },
          reason: 'row 3: model must not be blank',
        });
      });
    });
  });

  describe('drainBufferedUsage (token usage)', () => {
    const drain = (fetchImpl: HookFetch) =>
      drainBufferedUsage({
        authToken: 'tok',
        budgetMs: null,
        fetchImpl,
        graphqlUrl: URL,
        repoRoot,
        timeoutMs: 200,
      });

    it('delivers what a server-down run buffered, in batches, on a later drain', async () => {
      const down = fakeServer(() => new Error('ECONNREFUSED'));
      await persist(makeRecords(1100), down.fetchImpl);
      expect(readLines(defaultTokenUsageJsonlPath())).toHaveLength(1100);

      const up = fakeServer((_call, rows) => accepted(rows));
      const summary = await drain(up.fetchImpl);

      expect(up.calls.map((call) => call.rows)).toEqual([500, 500, 100]);
      expect(summary.tokenUsage).toEqual({
        deadLettered: 0,
        reasons: {},
        retained: 0,
        sent: 1100,
        skipped: 0,
      });
      expect(fs.existsSync(defaultTokenUsageJsonlPath())).toBe(false);
    });

    it('retains a transiently failed batch with its reason', async () => {
      await persist(makeRecords(3), fakeServer(() => new Error('x')).fetchImpl);
      const summary = await drain(
        fakeServer(() => ({ body: {}, status: 503 })).fetchImpl,
      );

      expect(summary.tokenUsage).toMatchObject({
        deadLettered: 0,
        reasons: { 'http 503': 3 },
        retained: 3,
        sent: 0,
      });
      expect(readLines(defaultTokenUsageJsonlPath())).toHaveLength(3);
    });

    it('dead-letters every line of a batch the server rejects', async () => {
      await persist(makeRecords(3), fakeServer(() => new Error('x')).fetchImpl);
      const summary = await drain(fakeServer(() => rejected).fetchImpl);

      expect(summary.tokenUsage).toMatchObject({
        deadLettered: 3,
        reasons: { 'row 3: model must not be blank': 3 },
        retained: 0,
        sent: 0,
      });
      expect(fs.existsSync(defaultTokenUsageJsonlPath())).toBe(false);
      expect(
        readLines(deadLetterPathFor(defaultTokenUsageJsonlPath())),
      ).toHaveLength(3);
    });

    it('skips a malformed buffered line and still sends the rest', async () => {
      fs.mkdirSync(telemetryDir, { recursive: true });
      fs.writeFileSync(
        defaultTokenUsageJsonlPath(),
        `${JSON.stringify(makeRecord(1))}\nnot json\n${JSON.stringify(makeRecord(2))}\n`,
      );
      const up = fakeServer((_call, rows) => accepted(rows));
      const summary = await drain(up.fetchImpl);

      expect(up.calls).toEqual([{ rows: 2 }]);
      expect(summary.tokenUsage).toMatchObject({ sent: 2, skipped: 1 });
    });
  });

  describe('foreign repositories', () => {
    it('writes nothing under the repo root on any path', async () => {
      const down = fakeServer(() => new Error('ECONNREFUSED'));
      await persist(makeRecords(5), down.fetchImpl);
      await drainBufferedUsage({
        authToken: 'tok',
        budgetMs: null,
        fetchImpl: fakeServer(() => rejected).fetchImpl,
        graphqlUrl: URL,
        repoRoot,
        timeoutMs: 200,
      });

      expect(fs.readdirSync(repoRoot)).toEqual([]);
      expect(fs.existsSync(telemetryDir)).toBe(true);
    });
  });
});
