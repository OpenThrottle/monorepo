/**
 * Unit tests for the session-scoped start-correlation store (`data/starts`).
 * Split out of the original package-wide `lib.test.ts` so each source module
 * owns its own spec.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  drainStartsForSession,
  listStartsForSession,
  recordSkillStart,
  startCorrelationKey,
  startsFilePathForSession,
} from '../../index';

describe('start-correlation store', () => {
  let startsDir: string;
  beforeAll(() => {
    startsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-starts-'));
  });
  afterAll(() => {
    fs.rmSync(startsDir, { force: true, recursive: true });
  });

  it('records a start (identifiers + timestamp only, no args)', () => {
    const res = recordSkillStart({
      repoRoot: startsDir,
      scope: 'ours',
      sessionId: 'sess-A',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'toolu_1',
    });
    expect(res.ok).toBe(true);

    const entries = listStartsForSession({
      repoRoot: startsDir,
      sessionId: 'sess-A',
      startsDir,
    });
    expect(entries.length).toBe(1);
    expect(entries[0]).toEqual({
      scope: 'ours',
      session_id: 'sess-A',
      skill_name: 'ot-plans',
      started_at: '2026-08-01T00:00:00.000Z',
      tool_use_id: 'toolu_1',
    });
    expect('args' in entries[0]).toBe(false);
  });

  it('skips (does not error) when session_id is missing', () => {
    const res = recordSkillStart({
      repoRoot: startsDir,
      sessionId: null,
      skillName: 'ot-plans',
      startsDir,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toMatch(/missing session_id/);
    }
  });

  it('lists [] for an unknown session and skips malformed lines', () => {
    expect(
      listStartsForSession({
        repoRoot: startsDir,
        sessionId: 'nope',
        startsDir,
      }),
    ).toEqual([]);

    const filePath = startsFilePathForSession(startsDir, 'sess-malformed');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      `{"session_id":"sess-malformed","skill_name":"a","started_at":"t","tool_use_id":null}\nnot-json\n`,
      'utf8',
    );
    const entries = listStartsForSession({
      repoRoot: startsDir,
      sessionId: 'sess-malformed',
      startsDir,
    });
    expect(entries.length).toBe(1);
    expect(entries[0].skill_name).toBe('a');
  });

  it('startCorrelationKey prefers tool_use_id, falls back to started_at', () => {
    expect(
      startCorrelationKey({
        session_id: 's',
        skill_name: 'k',
        started_at: 't',
        tool_use_id: 'tid',
      }),
    ).toBe('s::k::tid');
    expect(
      startCorrelationKey({
        session_id: 's',
        skill_name: 'k',
        started_at: 't',
        tool_use_id: null,
      }),
    ).toBe('s::k::t');
  });

  it('drains only resolved keys, retaining the rest, then unlinks when empty', () => {
    const sessionId = 'sess-drain';
    recordSkillStart({
      repoRoot: startsDir,
      sessionId,
      skillName: 'alpha',
      startedAt: 't1',
      startsDir,
      toolUseId: 'tu-1',
    });
    recordSkillStart({
      repoRoot: startsDir,
      sessionId,
      skillName: 'beta',
      startedAt: 't2',
      startsDir,
      toolUseId: 'tu-2',
    });

    const drained = drainStartsForSession({
      repoRoot: startsDir,
      resolvedKeys: new Set([`${sessionId}::alpha::tu-1`]),
      sessionId,
      startsDir,
    });
    expect(drained).toBe(1);

    const remaining = listStartsForSession({
      repoRoot: startsDir,
      sessionId,
      startsDir,
    });
    expect(remaining.length).toBe(1);
    expect(remaining[0].skill_name).toBe('beta');

    const drainedAll = drainStartsForSession({
      repoRoot: startsDir,
      sessionId,
      startsDir,
    });
    expect(drainedAll).toBe(1);
    expect(fs.existsSync(startsFilePathForSession(startsDir, sessionId))).toBe(
      false,
    );
    expect(
      drainStartsForSession({ repoRoot: startsDir, sessionId, startsDir }),
    ).toBe(0);
  });
});
