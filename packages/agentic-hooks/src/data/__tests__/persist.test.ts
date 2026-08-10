/**
 * Unit tests for persistence: GraphQL post, JSONL fallback, outcome
 * completion/sweep, and the buffered drain (`data/persist`). Split out of the
 * original package-wide `lib.test.ts` so each source module owns its own spec.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  completeOpenStartsForSession,
  drainBufferedUsage,
  listStartsForSession,
  persistOutcomeEvent,
  persistUsageEvent,
  postSkillUsageEvent,
  postSkillUsageOutcome,
  recordSkillStart,
  startsFilePathForSession,
  sweepAbandonedStarts,
} from '../../index';
import type { HookFetch, OutcomeEvent, UsageEvent } from '../../types';

/** Build a HookFetch that returns a fixed JSON body. */
const jsonFetch = (
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
): HookFetch => {
  return async () => ({ json: async () => body, ok, status });
};

describe('postSkillUsageEvent + persistUsageEvent', () => {
  let tmpRoot: string;
  let jsonlPath: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-persist-'));
    jsonlPath = path.join(tmpRoot, 'events.jsonl');
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const sampleEvent: UsageEvent = {
    args: 'ping',
    cwd: '/tmp',
    git_branch: 'example-usage-tracking',
    hook_event_name: 'PreToolUse',
    invocation_path: 'skill_tool',
    privacy_level: 'truncated',
    scope: 'ours',
    session_id: 'sess-p',
    skill_name: 'ot-plans',
    timestamp: '2026-08-01T00:00:00.000Z',
  };

  it('posts successfully and returns server id', async () => {
    const fetchImpl: HookFetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      expect(body.variables.input.skillName).toBe('ot-plans');
      expect(body.variables.input.occurredAt).toBe(sampleEvent.timestamp);
      return {
        json: async () => ({
          data: { recordSkillUsage: { id: 'evt-1', skillName: 'ot-plans' } },
        }),
        ok: true,
        status: 200,
      };
    };

    const result = await postSkillUsageEvent({
      authToken: 'tok',
      event: sampleEvent,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      timeoutMs: 200,
    });
    expect(result).toEqual({ id: 'evt-1', ok: true });
  });

  it('persistUsageEvent uses server sink on success (no JSONL)', async () => {
    const result = await persistUsageEvent({
      authToken: 'tok',
      event: sampleEvent,
      fetchImpl: jsonFetch({
        data: { recordSkillUsage: { id: 'evt-2', skillName: 'ot-plans' } },
      }),
      graphqlUrl: 'http://example.test/graphql',
      jsonlPath,
      repoRoot: tmpRoot,
      timeoutMs: 200,
    });

    expect(result.sink).toBe('server');
    expect(result.id).toBe('evt-2');
    expect(fs.existsSync(jsonlPath)).toBe(false);
  });

  it('falls back to JSONL when fetch fails', async () => {
    const offlinePath = path.join(tmpRoot, 'offline.jsonl');
    const fetchImpl: HookFetch = async () => {
      throw new Error('ECONNREFUSED');
    };

    const result = await persistUsageEvent({
      event: sampleEvent,
      fetchImpl,
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      jsonlPath: offlinePath,
      repoRoot: tmpRoot,
      timeoutMs: 50,
    });

    expect(result.sink).toBe('jsonl');
    expect(result.detail ?? '').toMatch(/ECONNREFUSED/);
    const line = JSON.parse(fs.readFileSync(offlinePath, 'utf8').trim());
    expect(line.skill_name).toBe('ot-plans');
  });

  it('falls back to JSONL when GraphQL returns errors', async () => {
    const errPath = path.join(tmpRoot, 'gql-err.jsonl');
    const result = await persistUsageEvent({
      event: sampleEvent,
      fetchImpl: jsonFetch({ errors: [{ message: 'Unauthorized' }] }),
      graphqlUrl: 'http://example.test/graphql',
      jsonlPath: errPath,
      repoRoot: tmpRoot,
      timeoutMs: 200,
    });

    expect(result.sink).toBe('jsonl');
    expect(result.detail ?? '').toMatch(/Unauthorized/);
    expect(fs.existsSync(errPath)).toBe(true);
  });

  it('SKILL_USAGE_DISABLE_SERVER forces JSONL without calling fetch', async () => {
    const forcedPath = path.join(tmpRoot, 'forced.jsonl');
    let called = false;
    const prev = process.env.SKILL_USAGE_DISABLE_SERVER;
    process.env.SKILL_USAGE_DISABLE_SERVER = '1';
    try {
      const result = await persistUsageEvent({
        event: sampleEvent,
        fetchImpl: async () => {
          called = true;
          throw new Error('should not run');
        },
        jsonlPath: forcedPath,
        repoRoot: tmpRoot,
      });
      expect(result.sink).toBe('jsonl');
      expect(called).toBe(false);
      expect(fs.existsSync(forcedPath)).toBe(true);
    } finally {
      if (prev === undefined) {
        delete process.env.SKILL_USAGE_DISABLE_SERVER;
      } else {
        process.env.SKILL_USAGE_DISABLE_SERVER = prev;
      }
    }
  });
});

describe('postSkillUsageOutcome / persistOutcomeEvent', () => {
  let tmpRoot: string;
  let jsonlPath: string;
  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-outcome-post-'));
    jsonlPath = path.join(tmpRoot, 'outcomes.jsonl');
  });
  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const sampleOutcome: OutcomeEvent = {
    cwd: '/tmp',
    duration_ms: 4200,
    event_kind: 'outcome',
    git_branch: 'example-usage-tracking',
    outcome: 'success',
    scope: 'ours',
    session_id: 'sess-1',
    skill_name: 'ot-plans',
    timestamp: '2026-08-01T12:00:00.000Z',
    tool_use_id: 'tool-1',
  };

  it('posts successfully and returns server id', async () => {
    const fetchImpl: HookFetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      expect(body.variables.input.skillName).toBe('ot-plans');
      expect(body.variables.input.outcome).toBe('success');
      return {
        json: async () => ({
          data: {
            recordSkillUsageOutcome: {
              id: 'out-1',
              outcome: 'success',
              skillName: 'ot-plans',
            },
          },
        }),
        ok: true,
        status: 200,
      };
    };

    const result = await postSkillUsageOutcome({
      authToken: 'tok',
      event: sampleOutcome,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      timeoutMs: 200,
    });
    expect(result).toEqual({ id: 'out-1', ok: true });
  });

  it('falls back to outcomes JSONL when fetch fails', async () => {
    const result = await persistOutcomeEvent({
      event: sampleOutcome,
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      jsonlPath,
      repoRoot: tmpRoot,
      timeoutMs: 50,
    });

    expect(result.sink).toBe('jsonl');
    const line = JSON.parse(fs.readFileSync(jsonlPath, 'utf8').trim());
    expect(line.event_kind).toBe('outcome');
    expect(line.skill_name).toBe('ot-plans');
  });
});

describe('completeOpenStartsForSession', () => {
  let tmpRoot: string;
  let startsDir: string;
  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-complete-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    startsDir = path.join(tmpRoot, 'starts');
  });
  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const recordingFetch =
    (sink: Array<Record<string, unknown>>): HookFetch =>
    async (_url, init) => {
      const body = JSON.parse(init.body);
      sink.push(body.variables.input);
      return {
        json: async () => ({
          data: { recordSkillUsageOutcome: { id: `out-${sink.length}` } },
        }),
        ok: true,
        status: 200,
      };
    };

  it('emits one success outcome per open start with computed duration, then drains', async () => {
    const sessionId = 'sess-complete';
    recordSkillStart({
      repoRoot: tmpRoot,
      scope: 'ours',
      sessionId,
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-a',
    });
    recordSkillStart({
      repoRoot: tmpRoot,
      scope: 'ours',
      sessionId,
      skillName: 'create-readme',
      startedAt: '2026-08-01T00:00:03.000Z',
      startsDir,
      toolUseId: 'tu-b',
    });

    const posted: Array<Record<string, unknown>> = [];
    const res = await completeOpenStartsForSession({
      fetchImpl: recordingFetch(posted),
      finishedAt: '2026-08-01T00:00:05.000Z',
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });

    expect(res.resolved).toBe(2);
    expect(posted.length).toBe(2);
    const bySkill = Object.fromEntries(
      posted.map((p) => [String(p.skillName), p]),
    );
    expect(bySkill['ot-plans'].outcome).toBe('success');
    expect(bySkill['ot-plans'].durationMs).toBe(5000);
    expect(bySkill['ot-plans'].sessionId).toBe(sessionId);
    expect(bySkill['ot-plans'].toolUseId).toBe('tu-a');
    expect(bySkill['create-readme'].durationMs).toBe(2000);

    expect(
      listStartsForSession({ repoRoot: tmpRoot, sessionId, startsDir }),
    ).toEqual([]);
    const posted2: Array<Record<string, unknown>> = [];
    const res2 = await completeOpenStartsForSession({
      fetchImpl: recordingFetch(posted2),
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });
    expect(res2.resolved).toBe(0);
    expect(posted2.length).toBe(0);
  });

  it('dedupes duplicate correlation lines (same key emits once)', async () => {
    const sessionId = 'sess-dupe';
    for (let i = 0; i < 3; i += 1) {
      recordSkillStart({
        repoRoot: tmpRoot,
        sessionId,
        skillName: 'ot-plans',
        startedAt: '2026-08-01T00:00:00.000Z',
        startsDir,
        toolUseId: 'tu-dupe',
      });
    }
    const posted: Array<Record<string, unknown>> = [];
    const res = await completeOpenStartsForSession({
      fetchImpl: recordingFetch(posted),
      finishedAt: '2026-08-01T00:00:01.000Z',
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });
    expect(res.resolved).toBe(1);
    expect(posted.length).toBe(1);
  });

  it('falls back to outcomes JSONL when the server is down, still draining starts', async () => {
    const sessionId = 'sess-offline';
    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId,
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-off',
    });
    const jsonlPath = path.join(tmpRoot, 'offline-outcomes.jsonl');
    const res = await completeOpenStartsForSession({
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
      finishedAt: '2026-08-01T00:00:02.000Z',
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      jsonlPath,
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
      timeoutMs: 50,
    });
    expect(res.resolved).toBe(1);
    expect(res.results[0].sink).toBe('jsonl');
    const line = JSON.parse(fs.readFileSync(jsonlPath, 'utf8').trim());
    expect(line.outcome).toBe('success');
    expect(line.duration_ms).toBe(2000);
    expect(
      listStartsForSession({ repoRoot: tmpRoot, sessionId, startsDir }),
    ).toEqual([]);
  });
});

describe('sweepAbandonedStarts', () => {
  let tmpRoot: string;
  let startsDir: string;
  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-abandoned-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    startsDir = path.join(tmpRoot, 'starts');
  });
  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('emits abandoned for stale foreign sessions, skips current + fresh files', async () => {
    const now = Date.parse('2026-08-02T00:00:00.000Z');
    const maxAgeMs = 6 * 60 * 60 * 1000;

    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId: 'sess-stale',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-stale',
    });
    const stalePath = startsFilePathForSession(startsDir, 'sess-stale');
    const oldMs = now - 24 * 60 * 60 * 1000;
    fs.utimesSync(stalePath, new Date(oldMs), new Date(oldMs));

    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId: 'sess-current',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-cur',
    });
    fs.utimesSync(
      startsFilePathForSession(startsDir, 'sess-current'),
      new Date(oldMs),
      new Date(oldMs),
    );

    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId: 'sess-fresh',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T23:59:00.000Z',
      startsDir,
      toolUseId: 'tu-fresh',
    });
    const freshMs = now - 60 * 1000;
    fs.utimesSync(
      startsFilePathForSession(startsDir, 'sess-fresh'),
      new Date(freshMs),
      new Date(freshMs),
    );

    const posted: Array<Record<string, unknown>> = [];
    const fetchImpl: HookFetch = async (_url, init) => {
      posted.push(JSON.parse(init.body).variables.input);
      return {
        json: async () => ({
          data: { recordSkillUsageOutcome: { id: 'a-1' } },
        }),
        ok: true,
        status: 200,
      };
    };

    const res = await sweepAbandonedStarts({
      currentSessionId: 'sess-current',
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      maxAgeMs,
      now,
      repoRoot: tmpRoot,
      startsDir,
    });

    expect(res.swept).toBe(1);
    expect(posted.length).toBe(1);
    expect(posted[0].outcome).toBe('abandoned');
    expect(posted[0].skillName).toBe('ot-plans');
    expect(posted[0].durationMs).toBeUndefined();

    expect(fs.existsSync(stalePath)).toBe(false);
    expect(
      fs.existsSync(startsFilePathForSession(startsDir, 'sess-current')),
    ).toBe(true);
    expect(
      fs.existsSync(startsFilePathForSession(startsDir, 'sess-fresh')),
    ).toBe(true);
  });
});

describe('drainBufferedUsage', () => {
  let tmpRoot: string;
  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-drainall-'));
  });
  afterEach(() => {
    delete process.env.SKILL_USAGE_DISABLE_SERVER;
  });
  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('drains both events + outcomes via the right mutations', async () => {
    const eventsPath = path.join(tmpRoot, 'events.jsonl');
    const outcomesPath = path.join(tmpRoot, 'outcomes.jsonl');
    fs.writeFileSync(
      eventsPath,
      `${JSON.stringify({ occurredAt: 't', scope: 'ours', skill_name: 'ot-plans', timestamp: 't' })}\n`,
      'utf8',
    );
    fs.writeFileSync(
      outcomesPath,
      `${JSON.stringify({ outcome: 'success', skill_name: 'ot-plans', timestamp: 't' })}\n`,
      'utf8',
    );

    const seenMutations: string[] = [];
    const fetchImpl: HookFetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      const isOutcome = String(body.query).includes('recordSkillUsageOutcome');
      seenMutations.push(isOutcome ? 'outcome' : 'usage');
      return {
        json: async () => ({
          data: isOutcome
            ? { recordSkillUsageOutcome: { id: 'o1' } }
            : { recordSkillUsage: { id: 'e1' } },
        }),
        ok: true,
        status: 200,
      };
    };

    const res = await drainBufferedUsage({
      eventsPath,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      outcomesPath,
      repoRoot: tmpRoot,
    });

    expect(res.events.sent).toBe(1);
    expect(res.outcomes.sent).toBe(1);
    expect(seenMutations.sort()).toEqual(['outcome', 'usage']);
    expect(fs.existsSync(eventsPath)).toBe(false);
    expect(fs.existsSync(outcomesPath)).toBe(false);
  });

  it('is a no-op when SKILL_USAGE_DISABLE_SERVER=1 (buffer left intact)', async () => {
    const eventsPath = path.join(tmpRoot, 'events-disabled.jsonl');
    fs.writeFileSync(eventsPath, `${JSON.stringify({ a: 1 })}\n`, 'utf8');
    process.env.SKILL_USAGE_DISABLE_SERVER = '1';
    const res = await drainBufferedUsage({
      eventsPath,
      fetchImpl: async () => {
        throw new Error('should not be called');
      },
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
    });
    expect(res.events.sent).toBe(0);
    expect(fs.existsSync(eventsPath)).toBe(true);
  });
});
