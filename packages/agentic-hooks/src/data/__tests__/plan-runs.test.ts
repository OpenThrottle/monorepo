import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PLAN_RUN_ABANDONED_MS,
  clearPlanRunForSession,
  planRunFilePath,
  recordPlanRunForSession,
  settleAbandonedPlanRuns,
} from '../plan-runs';

const GRAPHQL_URL = 'http://localhost:6021/graphql';

const okFetch = () =>
  vi.fn().mockResolvedValue({
    json: async () => ({ data: { settleCliPlanRun: { id: 'run-1' } } }),
    ok: true,
    status: 200,
  });

describe('plan-run janitor', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-runs-'));
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { force: true, recursive: true });
  });

  const seed = (sessionId: string, planRunId: string, ageMs = 0): string => {
    recordPlanRunForSession({
      planId: 'plan-1',
      planRunId,
      repoRoot,
      sessionId,
    });
    const filePath = planRunFilePath(repoRoot, sessionId);
    if (ageMs > 0) {
      const past = new Date(Date.now() - ageMs);
      fs.utimesSync(filePath, past, past);
    }
    return filePath;
  };

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

  it('settles FAILED a stale record from a dead session, and forgets it', async () => {
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
    expect(body).toMatchObject({
      variables: { input: { planRunId: 'run-dead', status: 'FAILED' } },
    });
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
    const past = new Date(Date.now() - PLAN_RUN_ABANDONED_MS - 60_000);
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
