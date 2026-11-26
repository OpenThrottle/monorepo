/**
 * The outcome reporter's host resolution (`../claude-host.ts`): which agent's
 * session a deliberate report belongs to, and which `source` it carries. Real
 * start files under a temp dir, because the start ledger is what decides a
 * nested launch.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  claimLatestStart,
  completeOpenStartsForSession,
  recordSkillStart,
} from '../../index.ts';
import {
  listReporterSessionCandidates,
  resolveReporterSession,
} from '../claude-host.ts';
import { CLAUDE_SOURCE } from '../claude-payload.ts';
import { CODEX_SOURCE, normalizeCodexPayload } from '../codex-payload.ts';
import { CURSOR_SOURCE } from '../cursor-payload.ts';

const CODEX_ENV: NodeJS.ProcessEnv = {
  CODEX_SESSION_ID: 'codex-thread',
  CODEX_THREAD_ID: 'codex-thread',
};
const CURSOR_ENV: NodeJS.ProcessEnv = {
  CURSOR_AGENT: '1',
  CURSOR_CONVERSATION_ID: 'cursor-conv',
};
const CLAUDE_ENV: NodeJS.ProcessEnv = {
  CLAUDE_CODE_SESSION_ID: 'claude-sess',
};

const sourceOf = (
  session: ReturnType<typeof resolveReporterSession>,
): string | null => {
  return session.kind === 'attributed' ? session.source : null;
};

describe('reporter host resolution', () => {
  let startsDir: string;

  const start = (sessionId: string, skillName = 'ot-plans'): void => {
    recordSkillStart({
      scope: 'ours',
      sessionId,
      skillName,
      startedAt: '2026-11-24T00:00:00.000Z',
      startsDir,
    });
  };

  const resolve = (
    env: NodeJS.ProcessEnv,
    overrides: {
      readonly explicitSessionId?: string | null;
      readonly explicitSource?: string | null;
    } = {},
  ): ReturnType<typeof resolveReporterSession> => {
    return resolveReporterSession({
      env,
      explicitSessionId: overrides.explicitSessionId ?? null,
      explicitSource: overrides.explicitSource ?? null,
      skillName: 'ot-plans',
      startsDir,
    });
  };

  beforeEach(() => {
    startsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reporter-host-'));
  });

  afterEach(() => {
    fs.rmSync(startsDir, { force: true, recursive: true });
  });

  describe('a single agent', () => {
    it('reads Claude Code from CLAUDE_CODE_SESSION_ID', () => {
      expect(resolve(CLAUDE_ENV)).toEqual({
        kind: 'attributed',
        sessionId: 'claude-sess',
        source: CLAUDE_SOURCE,
      });
    });

    it('falls back to the older CLAUDE_SESSION_ID', () => {
      expect(resolve({ CLAUDE_SESSION_ID: 'old' })).toEqual({
        kind: 'attributed',
        sessionId: 'old',
        source: CLAUDE_SOURCE,
      });
    });

    it('reads Codex from CODEX_SESSION_ID, then CODEX_THREAD_ID', () => {
      expect(resolve(CODEX_ENV)).toEqual({
        kind: 'attributed',
        sessionId: 'codex-thread',
        source: CODEX_SOURCE,
      });
      expect(resolve({ CODEX_THREAD_ID: 'only-thread' })).toEqual({
        kind: 'attributed',
        sessionId: 'only-thread',
        source: CODEX_SOURCE,
      });
    });

    it('reads Cursor from CURSOR_CONVERSATION_ID only under CURSOR_AGENT', () => {
      expect(resolve(CURSOR_ENV)).toEqual({
        kind: 'attributed',
        sessionId: 'cursor-conv',
        source: CURSOR_SOURCE,
      });
      expect(
        listReporterSessionCandidates({ CURSOR_CONVERSATION_ID: 'stray' }),
      ).toEqual([]);
    });
  });

  describe('no agent in the environment', () => {
    it('keeps the historical Claude Code source with no session', () => {
      expect(resolve({})).toEqual({
        kind: 'attributed',
        sessionId: null,
        source: CLAUDE_SOURCE,
      });
    });
  });

  describe('a nested launch', () => {
    it('picks the session that holds the skill start', () => {
      start('claude-sess');
      expect(resolve({ ...CLAUDE_ENV, ...CURSOR_ENV })).toEqual({
        kind: 'attributed',
        sessionId: 'claude-sess',
        source: CLAUDE_SOURCE,
      });
    });

    it('prefers the inner agent when no session holds a start', () => {
      expect(sourceOf(resolve({ ...CLAUDE_ENV, ...CURSOR_ENV }))).toBe(
        CURSOR_SOURCE,
      );
    });

    it('ignores a start recorded for a different skill', () => {
      start('claude-sess', 'github-commit');
      expect(sourceOf(resolve({ ...CLAUDE_ENV, ...CODEX_ENV }))).toBe(
        CODEX_SOURCE,
      );
    });
  });

  describe('an agent the reporter cannot attribute', () => {
    it('stands down in a Gemini CLI shell with no session of its own', () => {
      expect(resolve({ GEMINI_CLI: '1' })).toEqual({
        host: 'gemini-cli',
        kind: 'unattributable',
      });
    });

    it('stands down even when a parent Claude Code session id leaked in', () => {
      expect(resolve({ ...CLAUDE_ENV, OPENCODE: '1' })).toEqual({
        host: 'opencode',
        kind: 'unattributable',
      });
    });

    it('still attributes to a session that holds the skill start', () => {
      start('claude-sess');
      expect(resolve({ ...CLAUDE_ENV, GEMINI_CLI: '1' })).toEqual({
        kind: 'attributed',
        sessionId: 'claude-sess',
        source: CLAUDE_SOURCE,
      });
    });

    it('honours an explicit session', () => {
      expect(
        resolve({ GEMINI_CLI: '1' }, { explicitSessionId: 'given' }),
      ).toEqual({
        kind: 'attributed',
        sessionId: 'given',
        source: CLAUDE_SOURCE,
      });
    });
  });

  describe('explicit overrides', () => {
    it('uses an explicit session with an explicit known source', () => {
      expect(
        resolve(CLAUDE_ENV, {
          explicitSessionId: 'given',
          explicitSource: CODEX_SOURCE,
        }),
      ).toEqual({
        kind: 'attributed',
        sessionId: 'given',
        source: CODEX_SOURCE,
      });
    });

    it('takes the source from the environment when only the session is given', () => {
      expect(resolve(CURSOR_ENV, { explicitSessionId: 'given' })).toEqual({
        kind: 'attributed',
        sessionId: 'given',
        source: CURSOR_SOURCE,
      });
    });

    it('scopes candidates to an explicit source', () => {
      start('cursor-conv');
      expect(
        resolve(
          { ...CLAUDE_ENV, ...CURSOR_ENV },
          {
            explicitSource: CLAUDE_SOURCE,
          },
        ),
      ).toEqual({
        kind: 'attributed',
        sessionId: 'claude-sess',
        source: CLAUDE_SOURCE,
      });
    });

    it('ignores an unknown explicit source', () => {
      expect(sourceOf(resolve(CODEX_ENV, { explicitSource: 'nope' }))).toBe(
        CODEX_SOURCE,
      );
    });
  });

  describe('a Codex skill reported from the Codex shell', () => {
    it('claims the capture start: a duration, and no session_ended row', async () => {
      const normalized = normalizeCodexPayload({
        cwd: startsDir,
        hook_event_name: 'UserPromptSubmit',
        prompt: '/ot-plans list pending',
        session_id: 'codex-thread',
        turn_id: 'turn-1',
      });
      expect(normalized?.session_id).toBe('codex-thread');
      recordSkillStart({
        sessionId: normalized?.session_id,
        skillName: normalized?.skill_name,
        startedAt: '2026-11-24T00:00:00.000Z',
        startsDir,
        toolUseId: normalized?.tool_use_id ?? null,
      });

      const session = resolve({ ...CLAUDE_ENV, ...CODEX_ENV });
      expect(session).toEqual({
        kind: 'attributed',
        sessionId: 'codex-thread',
        source: CODEX_SOURCE,
      });

      const durationMs = claimLatestStart({
        nowMs: Date.parse('2026-11-24T00:00:03.000Z'),
        sessionId: session.kind === 'attributed' ? session.sessionId : null,
        skillName: 'ot-plans',
        startsDir,
      });
      expect(durationMs).toBe(3000);

      const jsonlPath = path.join(startsDir, 'outcomes.jsonl');
      const completed = await completeOpenStartsForSession({
        jsonlPath,
        repoRoot: startsDir,
        sessionId: 'codex-thread',
        source: CODEX_SOURCE,
        startsDir,
      });
      expect(completed.resolved).toBe(0);
      expect(fs.existsSync(jsonlPath)).toBe(false);
    });
  });
});
