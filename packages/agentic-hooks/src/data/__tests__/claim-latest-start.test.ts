/**
 * Unit tests for `claimLatestStart` (`data/starts`): the deliberate reporter's
 * skill-scoped duration. Real files under a temp starts dir, so the drain is
 * observed through the same ledger the turn-end hook reads.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  claimLatestStart,
  listStartsForSession,
  recordSkillStart,
} from '../../index.ts';

describe('claimLatestStart', () => {
  let startsDir: string;

  const start = (skillName: string, startedAt: string): void => {
    recordSkillStart({
      scope: 'ours',
      sessionId: 'sess-claim',
      skillName,
      startedAt,
      startsDir,
      toolUseId: `toolu_${skillName}_${startedAt}`,
    });
  };

  const remaining = (): number => {
    return listStartsForSession({ sessionId: 'sess-claim', startsDir }).length;
  };

  beforeEach(() => {
    startsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-claim-'));
  });

  afterEach(() => {
    fs.rmSync(startsDir, { force: true, recursive: true });
  });

  it('returns load→now for the matching start and drains only that entry', () => {
    start('github-commit', '2026-11-09T00:00:00.000Z');
    start('ot-plans', '2026-11-09T00:00:01.000Z');

    const durationMs = claimLatestStart({
      nowMs: Date.parse('2026-11-09T00:00:04.200Z'),
      sessionId: 'sess-claim',
      skillName: 'github-commit',
      startsDir,
    });

    expect(durationMs).toBe(4200);
    expect(remaining()).toBe(1);
  });

  it('claims the most recent start when the skill loaded more than once', () => {
    start('github-commit', '2026-11-09T00:00:00.000Z');
    start('github-commit', '2026-11-09T00:00:10.000Z');

    const durationMs = claimLatestStart({
      nowMs: Date.parse('2026-11-09T00:00:12.000Z'),
      sessionId: 'sess-claim',
      skillName: 'github-commit',
      startsDir,
    });

    expect(durationMs).toBe(2000);
    expect(remaining()).toBe(1);
  });

  it('returns null and drains nothing when the skill has no open start', () => {
    start('ot-plans', '2026-11-09T00:00:00.000Z');

    expect(
      claimLatestStart({
        nowMs: Date.parse('2026-11-09T00:00:05.000Z'),
        sessionId: 'sess-claim',
        skillName: 'github-commit',
        startsDir,
      }),
    ).toBeNull();
    expect(remaining()).toBe(1);
  });

  it('returns null and drains nothing when the clock reads before the start', () => {
    start('github-commit', '2026-11-09T00:00:10.000Z');

    expect(
      claimLatestStart({
        nowMs: Date.parse('2026-11-09T00:00:05.000Z'),
        sessionId: 'sess-claim',
        skillName: 'github-commit',
        startsDir,
      }),
    ).toBeNull();
    expect(remaining()).toBe(1);
  });

  it('returns null without a session id', () => {
    expect(
      claimLatestStart({
        sessionId: null,
        skillName: 'github-commit',
        startsDir,
      }),
    ).toBeNull();
  });
});
