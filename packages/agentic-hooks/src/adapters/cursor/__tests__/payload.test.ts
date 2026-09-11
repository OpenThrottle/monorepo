/**
 * Unit tests for the Cursor adapter payload normalization + the seam contract
 * (normalized invocation + CURSOR_SOURCE → source-stamped event).
 *
 * Every positive case runs against a payload captured verbatim from
 * `cursor-agent 2026.09.10-fd3934a` (`./fixtures/`, paths and operator email
 * scrubbed). See `docs/monorepo/cursor-agent-hook-probe.md` for how they were
 * taken. Hand-written payloads are used only for shapes the probe could not
 * elicit headless — the `beforeSubmitPrompt` slash path.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildUsageEvent } from '../../../index.ts';
import {
  CURSOR_SOURCE,
  cursorOutcomeForFinalStatus,
  normalizeCursorPayload,
  normalizeCursorSessionEndPayload,
} from '../payload.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const fixture = (name: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixturesDir, `${name}.json`), 'utf8'));

describe('normalizeCursorPayload', () => {
  it('maps a captured preToolUse Read of a SKILL.md', () => {
    expect(normalizeCursorPayload(fixture('pre-tool-use-skill-read'))).toEqual({
      args: '',
      cwd: '/tmp/probe-repo',
      hook_event_name: 'preToolUse',
      invocation_path: 'skill_read',
      session_id: 'e747cb7c-e568-4341-aece-6fe8bb11b174',
      skill_name: 'probe-ping',
      tool_use_id: 'toolu_bdrk_01Rrz6PdLgA78QuDLzHHXzpT',
    });
  });

  it('returns null for a captured preToolUse of an unrelated tool', () => {
    // The Shell tool's payload is the shape most likely to be mistaken for a
    // skill invocation — it even carries a cwd the others do not.
    expect(normalizeCursorPayload(fixture('pre-tool-use-shell'))).toBeNull();
  });

  it('returns null for a captured postToolUse of the same SKILL.md read', () => {
    // Capture keys off preToolUse only; counting the post event too would
    // double every invocation.
    expect(
      normalizeCursorPayload(fixture('post-tool-use-skill-read')),
    ).toBeNull();
  });

  it('returns null for captured session lifecycle payloads', () => {
    expect(normalizeCursorPayload(fixture('session-start'))).toBeNull();
    expect(normalizeCursorPayload(fixture('session-end'))).toBeNull();
    expect(
      normalizeCursorPayload(fixture('before-read-file-skill')),
    ).toBeNull();
  });

  it('returns null for a Read of a file that is not a SKILL.md', () => {
    expect(
      normalizeCursorPayload({
        hook_event_name: 'preToolUse',
        session_id: 'sess-1',
        tool_input: { file_path: '/tmp/repo/src/index.ts' },
        tool_name: 'Read',
        workspace_roots: ['/tmp/repo'],
      }),
    ).toBeNull();
  });

  it('maps a beforeSubmitPrompt slash command', () => {
    expect(
      normalizeCursorPayload({
        attachments: [],
        hook_event_name: 'beforeSubmitPrompt',
        prompt: '/ot-plans list the open plans',
        session_id: 'sess-2',
        workspace_roots: ['/tmp/repo'],
      }),
    ).toEqual({
      args: 'list the open plans',
      cwd: '/tmp/repo',
      hook_event_name: 'beforeSubmitPrompt',
      invocation_path: 'slash',
      session_id: 'sess-2',
      skill_name: 'ot-plans',
    });
  });

  it('returns null for a beforeSubmitPrompt with no leading slash command', () => {
    expect(
      normalizeCursorPayload({
        attachments: [],
        hook_event_name: 'beforeSubmitPrompt',
        prompt: 'please fix the failing test in src/index.ts',
        session_id: 'sess-3',
        workspace_roots: ['/tmp/repo'],
      }),
    ).toBeNull();
  });

  it('returns null for non-records and unknown events', () => {
    expect(normalizeCursorPayload(null)).toBeNull();
    expect(
      normalizeCursorPayload({ hook_event_name: 'afterFileEdit' }),
    ).toBeNull();
    expect(normalizeCursorPayload({ cwd: '/tmp' })).toBeNull();
  });

  it('falls back to conversation_id when session_id is absent', () => {
    const normalized = normalizeCursorPayload({
      conversation_id: 'conv-7',
      hook_event_name: 'preToolUse',
      tool_input: { file_path: '/tmp/repo/.agents/skills/ot-plans/SKILL.md' },
      tool_name: 'Read',
      workspace_roots: ['/tmp/repo'],
    });
    expect(normalized?.session_id).toBe('conv-7');
  });
});

describe('normalizeCursorSessionEndPayload', () => {
  it('maps the captured sessionEnd payload', () => {
    expect(normalizeCursorSessionEndPayload(fixture('session-end'))).toEqual({
      cwd: '/tmp/probe-repo',
      final_status: 'completed',
      hook_event_name: 'sessionEnd',
      session_id: 'e747cb7c-e568-4341-aece-6fe8bb11b174',
    });
  });

  it('ignores every other event, including stop', () => {
    expect(
      normalizeCursorSessionEndPayload(fixture('session-start')),
    ).toBeNull();
    expect(
      normalizeCursorSessionEndPayload({
        hook_event_name: 'stop',
        session_id: 'sess-4',
      }),
    ).toBeNull();
    expect(normalizeCursorSessionEndPayload(null)).toBeNull();
  });

  it('returns null without a usable session id', () => {
    expect(
      normalizeCursorSessionEndPayload({ hook_event_name: 'sessionEnd' }),
    ).toBeNull();
  });
});

describe('cursorOutcomeForFinalStatus', () => {
  it('treats only completed as success', () => {
    expect(cursorOutcomeForFinalStatus('completed')).toBe('success');
  });

  it('treats error and failed as error', () => {
    expect(cursorOutcomeForFinalStatus('error')).toBe('error');
    expect(cursorOutcomeForFinalStatus('failed')).toBe('error');
  });

  it('treats every stopped-early status as abandoned', () => {
    expect(cursorOutcomeForFinalStatus('aborted')).toBe('abandoned');
    expect(cursorOutcomeForFinalStatus('cancelled')).toBe('abandoned');
    expect(cursorOutcomeForFinalStatus('timeout')).toBe('abandoned');
  });

  it('treats an unknown or absent status as abandoned, never success', () => {
    // A status Cursor has not shipped yet must not be silently counted as a
    // successful run.
    expect(cursorOutcomeForFinalStatus('some-future-status')).toBe('abandoned');
    expect(cursorOutcomeForFinalStatus(null)).toBe('abandoned');
  });
});

describe('adapter seam → cursor-sourced event', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-adapter-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a cursor sourced event from a Cursor payload', () => {
    const normalized = normalizeCursorPayload({
      hook_event_name: 'preToolUse',
      session_id: 'conv-9',
      tool_input: {
        file_path: path.join(tmpRoot, 'skills', 'ot-plans', 'SKILL.md'),
      },
      tool_name: 'Read',
      workspace_roots: [tmpRoot],
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      repoRoot: tmpRoot,
      source: CURSOR_SOURCE,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    expect(event).not.toBeNull();
    if (!event) {
      return;
    }
    expect(event.source).toBe('cursor');
    expect(event.skill_name).toBe('ot-plans');
    expect(event.scope).toBe('ours');
    expect(event.invocation_path).toBe('skill_read');
  });
});
