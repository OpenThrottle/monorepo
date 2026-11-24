/**
 * A skill start's lifetime across turns: it stays open through turn ends, is
 * claimed by the skill's own reporter whenever that runs, and resolves to one
 * `session_ended` row at session end only if nobody claimed it. Spans
 * `data/starts` (record, claim) and `data/persist` (session-end resolution).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  claimLatestStart,
  completeOpenStartsForSession,
  listStartsForSession,
  recordSkillStart,
} from '../../index.ts';
import type { HookFetch } from '../../types.ts';

let isolatedTelemetryDir: string;
let prevTelemetryDir: string | undefined;

beforeAll(() => {
  isolatedTelemetryDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'skill-lifetime-telemetry-'),
  );
  prevTelemetryDir = process.env.OPENTHROTTLE_TELEMETRY_DIR;
  process.env.OPENTHROTTLE_TELEMETRY_DIR = isolatedTelemetryDir;
});

afterAll(() => {
  if (prevTelemetryDir === undefined) {
    delete process.env.OPENTHROTTLE_TELEMETRY_DIR;
  } else {
    process.env.OPENTHROTTLE_TELEMETRY_DIR = prevTelemetryDir;
  }
  fs.rmSync(isolatedTelemetryDir, { force: true, recursive: true });
});

describe('skill start lifetime', () => {
  const sessionId = 'sess-lifetime';
  let tmpRoot: string;
  let startsDir: string;
  let posted: Array<Record<string, unknown>>;

  const recordingFetch: HookFetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    posted.push(body.variables.input);
    return {
      json: async () => ({
        data: { recordSkillUsageOutcome: { id: `out-${posted.length}` } },
      }),
      ok: true,
      status: 200,
    };
  };

  const endSession = async (): Promise<void> => {
    await completeOpenStartsForSession({
      fetchImpl: recordingFetch,
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-lifetime-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    startsDir = path.join(tmpRoot, 'starts');
    posted = [];
    // Turn 1: the skill loads.
    recordSkillStart({
      scope: 'ours',
      sessionId,
      skillName: 'ot-plans',
      startedAt: '2026-11-24T10:00:00.000Z',
      startsDir,
      toolUseId: 'tu-turn-1',
    });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('gives a skill that reports in turn 3 its load→report duration, and no session_ended row', async () => {
    // Turns 1 and 2 end. Nothing resolves starts at a turn end, so the start
    // is still there for turn 3's reporter.
    expect(listStartsForSession({ sessionId, startsDir })).toHaveLength(1);

    const durationMs = claimLatestStart({
      nowMs: Date.parse('2026-11-24T10:07:30.000Z'),
      sessionId,
      skillName: 'ot-plans',
      startsDir,
    });
    await endSession();

    expect(durationMs).toBe(450_000);
    expect(posted).toHaveLength(0);
    expect(listStartsForSession({ sessionId, startsDir })).toHaveLength(0);
  });

  it('resolves a start nobody reported to exactly one session_ended row at session end', async () => {
    await endSession();
    await endSession();

    expect(posted).toHaveLength(1);
    expect(posted[0]?.outcome).toBe('session_ended');
    expect(posted[0]?.durationMs ?? null).toBeNull();
    expect(listStartsForSession({ sessionId, startsDir })).toHaveLength(0);
  });
});
