import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPlanRunForSession,
  PLAN_RUN_ABANDONED_MS,
  PLAN_RUN_JANITOR_SETTLED_REASON,
  planRunFilePath,
  recordPlanRunForSession,
  settleAbandonedPlanRuns,
  touchPlanRunForSession,
} from '../plan-runs.ts';

const GRAPHQL_URL = 'http://localhost:6021/graphql';
const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');
const HOST = 'test-host';
const HOUR_MS = 60 * 60 * 1000;
const LIVE_PID = 4242;
const DEAD_PID = 4343;

const okFetch = () => {
  return vi.fn().mockResolvedValue({
    json: async () => ({ data: { forceSettlePlanRun: { id: 'run-1' } } }),
    ok: true,
    status: 200,
  });
};

describe('plan-run janitor', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-runs-'));
    // Notes live under the telemetry dir in the operator's home; keep them in the
    // test's own tree so nothing touches the real ~/.openthrottle.
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_DIR', path.join(repoRoot, '.telemetry'));
    // The janitor ages records against the clock; pin Date only so aged
    // mtimes seeded below line up with it.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    fs.rmSync(repoRoot, { force: true, recursive: true });
  });

  // Only LIVE_PID is alive; every other pid is a process that has exited.
  const isProcessAlive = (pid: number): boolean => {
    return pid === LIVE_PID;
  };

  const settle = (
    currentSessionId: string,
    overrides: {
      readonly fetchImpl?: typeof globalThis.fetch;
      readonly now?: number;
    } = {},
  ): Promise<{ settled: number }> => {
    return settleAbandonedPlanRuns({
      authToken: 't',
      currentSessionId,
      fetchImpl: overrides.fetchImpl ?? okFetch(),
      graphqlUrl: GRAPHQL_URL,
      hostname: HOST,
      isProcessAlive,
      now: overrides.now ?? FIXED_NOW.getTime(),
      repoRoot,
    });
  };

  const seed = (
    sessionId: string,
    planRunId: string,
    ageMs = 0,
    pid: number | null = DEAD_PID,
  ): string => {
    recordPlanRunForSession({
      hostname: HOST,
      pid,
      planId: 'plan-1',
      planRunId,
      repoRoot,
      sessionId,
    });
    const filePath = planRunFilePath(repoRoot, sessionId);
    if (ageMs > 0) {
      const past = new Date(FIXED_NOW.getTime() - ageMs);
      fs.utimesSync(filePath, past, past);
    }
    return filePath;
  };

  it('keeps the note out of the checkout, in a per-repo partition', () => {
    const filePath = seed('sess-1', 'run-1');
    expect(
      filePath.startsWith(path.join(repoRoot, '.telemetry', 'plan-runs')),
    ).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, '.cache'))).toBe(false);

    const otherRepo = path.join(repoRoot, 'other');
    expect(planRunFilePath(otherRepo, 'sess-1')).not.toBe(filePath);
  });

  it('records a run for a session and clears it again', () => {
    const filePath = seed('sess-1', 'run-1');
    expect(fs.existsSync(filePath)).toBe(true);

    clearPlanRunForSession({ repoRoot, sessionId: 'sess-1' });
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('never settles the current session, however old its record looks', async () => {
    // This is the safety property, and it is an exclusion BY ID applied before age is
    // even considered — so the janitor is structurally incapable of racing live work,
    // rather than merely unlikely to.
    const filePath = seed('sess-live', 'run-live', PLAN_RUN_ABANDONED_MS * 10);
    const fetchImpl = okFetch();

    const result = await settleAbandonedPlanRuns({
      authToken: 't',
      currentSessionId: 'sess-live',
      fetchImpl,
      graphqlUrl: GRAPHQL_URL,
      repoRoot,
    });

    expect(result.settled).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('leaves a recent record from another session alone', async () => {
    // A quiet gap is normal for an agent turn. Only a record untouched for longer
    // than any plausible turn counts as proof of abandonment.
    seed('sess-other', 'run-other');
    const fetchImpl = okFetch();

    const result = await settleAbandonedPlanRuns({
      authToken: 't',
      currentSessionId: 'sess-live',
      fetchImpl,
      graphqlUrl: GRAPHQL_URL,
      repoRoot,
    });

    expect(result.settled).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('settles STALE, with a reason, a stale record from a dead session, and forgets it', async () => {
    const filePath = seed(
      'sess-dead',
      'run-dead',
      PLAN_RUN_ABANDONED_MS + 60_000,
    );
    const fetchImpl = okFetch();

    const result = await settleAbandonedPlanRuns({
      authToken: 't',
      currentSessionId: 'sess-live',
      fetchImpl,
      graphqlUrl: GRAPHQL_URL,
      repoRoot,
    });

    expect(result.settled).toBe(1);
    expect(fs.existsSync(filePath)).toBe(false);

    const init = fetchImpl.mock.calls[0]?.[1];
    if (!init || typeof init.body !== 'string') {
      throw new Error('expected the settle call to carry a JSON body');
    }
    const body: unknown = JSON.parse(init.body);
    // STALE via forceSettlePlanRun, never FAILED: the janitor knows contact was lost, not
    // how the work ended. The reason says which backstop fired.
    expect(body).toMatchObject({
      query: expect.stringContaining('forceSettlePlanRun'),
      variables: {
        input: {
          planRunId: 'run-dead',
          reason: PLAN_RUN_JANITOR_SETTLED_REASON,
        },
      },
    });
  });

  describe('a loop paused on a human gate', () => {
    // The incident (OT plan 6cad3e93): a loop registered its run, paused on a question to
    // the user, resumed, and was settled FAILED at 6h02m by ANOTHER session's Stop —
    // because nothing refreshed the record after register, so "untouched for 6h" meant
    // only "the run is 6h old".
    it('keeps its run when its own Stop (the turn that ended on the question) refreshed the record', async () => {
      const filePath = seed('sess-loop', 'run-loop', 0, DEAD_PID);
      const fetchImpl = okFetch();

      // 5h in, the loop's turn ends on a question: its own Stop fires.
      await settle('sess-loop', { now: FIXED_NOW.getTime() + 5 * HOUR_MS });

      // 6h30m in — past the threshold measured from register — an unrelated session
      // in the same checkout ends a turn.
      const result = await settle('sess-other', {
        fetchImpl,
        now: FIXED_NOW.getTime() + 6.5 * HOUR_MS,
      });

      expect(result.settled).toBe(0);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('keeps its run while its MCP process is alive, however long the human takes', async () => {
      const filePath = seed(
        'sess-loop',
        'run-loop',
        PLAN_RUN_ABANDONED_MS * 3,
        LIVE_PID,
      );
      const fetchImpl = okFetch();

      const result = await settle('sess-other', { fetchImpl });

      expect(result.settled).toBe(0);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('still settles once the session is really gone: quiet past the threshold AND its process exited', async () => {
      seed('sess-loop', 'run-loop', 0, DEAD_PID);
      await settle('sess-loop', { now: FIXED_NOW.getTime() + HOUR_MS });
      const fetchImpl = okFetch();

      const result = await settle('sess-other', {
        fetchImpl,
        now: FIXED_NOW.getTime() + HOUR_MS + PLAN_RUN_ABANDONED_MS + 60_000,
      });

      expect(result.settled).toBe(1);
    });
  });

  it('cannot check liveness on another host, so falls back to age alone', async () => {
    // LIVE_PID is alive HERE, which says nothing about a pid on another machine.
    recordPlanRunForSession({
      hostname: 'elsewhere',
      pid: LIVE_PID,
      planId: 'plan-1',
      planRunId: 'run-remote',
      repoRoot,
      sessionId: 'sess-remote',
    });
    const filePath = planRunFilePath(repoRoot, 'sess-remote');
    const past = new Date(FIXED_NOW.getTime() - PLAN_RUN_ABANDONED_MS - 60_000);
    fs.utimesSync(filePath, past, past);

    await expect(settle('sess-other')).resolves.toEqual({ settled: 1 });
  });

  it('settles a legacy record with no pid on age alone', async () => {
    seed('sess-old', 'run-old', PLAN_RUN_ABANDONED_MS + 60_000, null);

    await expect(settle('sess-other')).resolves.toEqual({ settled: 1 });
  });

  it('touches nothing for a session that recorded no run', () => {
    expect(touchPlanRunForSession({ repoRoot, sessionId: 'sess-none' })).toBe(
      false,
    );
  });

  it('keeps the record when the settle call fails, for the next Stop to retry', async () => {
    const filePath = seed(
      'sess-dead',
      'run-dead',
      PLAN_RUN_ABANDONED_MS + 60_000,
    );
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ errors: [{ message: 'nope' }] }),
      ok: false,
      status: 500,
    });

    const result = await settleAbandonedPlanRuns({
      authToken: 't',
      currentSessionId: 'sess-live',
      fetchImpl,
      graphqlUrl: GRAPHQL_URL,
      repoRoot,
    });

    expect(result.settled).toBe(0);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('does nothing when no GraphQL url can be resolved', async () => {
    seed('sess-dead', 'run-dead', PLAN_RUN_ABANDONED_MS + 60_000);
    const fetchImpl = okFetch();

    const result = await settleAbandonedPlanRuns({
      currentSessionId: 'sess-live',
      fetchImpl,
      graphqlUrl: null,
      repoRoot,
    });

    expect(result.settled).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('drops an unreadable record rather than retrying it forever', async () => {
    const filePath = seed(
      'sess-bad',
      'run-bad',
      PLAN_RUN_ABANDONED_MS + 60_000,
    );
    fs.writeFileSync(filePath, 'not json', 'utf8');
    const past = new Date(FIXED_NOW.getTime() - PLAN_RUN_ABANDONED_MS - 60_000);
    fs.utimesSync(filePath, past, past);
    const fetchImpl = okFetch();

    await settleAbandonedPlanRuns({
      authToken: 't',
      currentSessionId: 'sess-live',
      fetchImpl,
      graphqlUrl: GRAPHQL_URL,
      repoRoot,
    });

    expect(fs.existsSync(filePath)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns cleanly when no state directory exists at all', async () => {
    await expect(
      settleAbandonedPlanRuns({ graphqlUrl: GRAPHQL_URL, repoRoot }),
    ).resolves.toEqual({ settled: 0 });
  });
});
