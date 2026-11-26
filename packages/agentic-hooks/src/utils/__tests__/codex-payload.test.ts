/**
 * Unit tests for the Codex adapter payload normalization + the seam contract.
 *
 * Positive cases run against payloads captured verbatim from `codex-cli 0.145.0`
 * and, for `PreToolUse`, `codex-cli 0.167.0` (`./fixtures/`, paths scrubbed).
 * See `docs/monorepo/codex-cli-hook-probe.md`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildUsageEvent } from '../../index.ts';
import {
  CODEX_SOURCE,
  normalizeCodexPayload,
  normalizeCodexSessionEndPayload,
} from '../codex-payload.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'fixtures',
  'codex',
);

const fixture = (name: string): unknown => {
  return JSON.parse(
    fs.readFileSync(path.join(fixturesDir, `${name}.json`), 'utf8'),
  );
};

describe('normalizeCodexPayload', () => {
  it('returns null for a captured plain prompt', () => {
    // The captured UserPromptSubmit is a plain sentence, not a slash command.
    expect(normalizeCodexPayload(fixture('user-prompt-submit'))).toBeNull();
  });

  it('maps a slash command on the captured envelope', () => {
    const captured = fixture('user-prompt-submit');
    const isObject = typeof captured === 'object' && captured !== null;
    const slashPrompt = { prompt: '/ot-plans list the open plans' };
    const payload = isObject ? { ...captured, ...slashPrompt } : {};
    expect(normalizeCodexPayload(payload)).toEqual({
      args: 'list the open plans',
      cwd: '/tmp/probe-repo',
      hook_event_name: 'UserPromptSubmit',
      invocation_path: 'slash',
      session_id: '01a092c0-bba1-71e2-bb55-b6b904201cf7',
      skill_name: 'ot-plans',
      tool_use_id: '01a092c0-bc5d-74e2-b2b6-1731849ea539',
    });
  });

  it('returns null for captured session lifecycle payloads', () => {
    expect(normalizeCodexPayload(fixture('session-start'))).toBeNull();
    expect(normalizeCodexPayload(fixture('session-end'))).toBeNull();
  });

  it('returns null for non-records and unknown events', () => {
    expect(normalizeCodexPayload(null)).toBeNull();
    expect(normalizeCodexPayload({ hook_event_name: 'PreCompact' })).toBeNull();
  });
});

describe('normalizeCodexPayload — PreToolUse skill read', () => {
  const withCommand = (command: unknown): unknown => {
    const captured = fixture('pre-tool-use');
    const isObject = typeof captured === 'object' && captured !== null;
    return isObject ? { ...captured, tool_input: { command } } : {};
  };

  it('maps the captured `cat <skill>/SKILL.md` read', () => {
    expect(normalizeCodexPayload(fixture('pre-tool-use'))).toEqual({
      args: '',
      cwd: '/tmp/probe-repo',
      hook_event_name: 'PreToolUse',
      invocation_path: 'skill_read',
      session_id: '01a21067-d913-71c0-bad4-8d92a8f4c1d9',
      skill_name: 'ot-probe-ping',
      tool_use_id: 'exec-b8ed9ba6-768c-44e9-8e09-76df0dc86cfb',
    });
  });

  it('maps an absolute or quoted skill path', () => {
    expect(
      normalizeCodexPayload(
        withCommand('cat /home/probe/.codex/skills/ot-plans/SKILL.md'),
      ),
    ).toMatchObject({ skill_name: 'ot-plans' });
    expect(
      normalizeCodexPayload(withCommand("cat '/a b/skills/ot-loop/SKILL.md'")),
    ).toMatchObject({ skill_name: 'ot-loop' });
  });

  it('returns null when the cat target is not a SKILL.md', () => {
    expect(normalizeCodexPayload(withCommand('cat README.md'))).toBeNull();
    expect(
      normalizeCodexPayload(withCommand('cat skills/ot-plans/SKILL.md.bak')),
    ).toBeNull();
  });

  it.each([
    "sed -n '1,200p' skills/ot-plans/SKILL.md",
    'cat skills/ot-plans/SKILL.md | head',
    'cat skills/ot-plans/SKILL.md && ls',
    'cat a/SKILL.md b/SKILL.md',
    'cat $(echo skills/ot-plans/SKILL.md)',
    'vim skills/ot-plans/SKILL.md',
    'ls',
  ])('returns null for the unmeasured command shape %s', (command) => {
    expect(normalizeCodexPayload(withCommand(command))).toBeNull();
  });

  it('returns null for a non-Bash tool or a missing command', () => {
    const captured = fixture('pre-tool-use');
    const isObject = typeof captured === 'object' && captured !== null;
    const otherTool = isObject ? { ...captured, tool_name: 'apply_patch' } : {};
    expect(normalizeCodexPayload(otherTool)).toBeNull();
    expect(normalizeCodexPayload(withCommand(42))).toBeNull();
  });
});

describe('normalizeCodexSessionEndPayload', () => {
  it('maps the captured SessionEnd payload', () => {
    expect(normalizeCodexSessionEndPayload(fixture('session-end'))).toEqual({
      hook_event_name: 'SessionEnd',
      reason: 'other',
      session_id: '01a092c0-bba1-71e2-bb55-b6b904201cf7',
    });
  });

  it('ignores every other event, including Stop', () => {
    expect(
      normalizeCodexSessionEndPayload(fixture('session-start')),
    ).toBeNull();
    expect(
      normalizeCodexSessionEndPayload({
        hook_event_name: 'Stop',
        session_id: 'sess-2',
      }),
    ).toBeNull();
  });

  it('returns null without a usable session id', () => {
    expect(
      normalizeCodexSessionEndPayload({ hook_event_name: 'SessionEnd' }),
    ).toBeNull();
  });
});

describe('adapter seam → codex-sourced event', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-adapter-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a codex sourced event from a Codex payload', () => {
    const normalized = normalizeCodexPayload({
      cwd: tmpRoot,
      hook_event_name: 'UserPromptSubmit',
      prompt: '/ot-plans',
      session_id: 'sess-9',
      turn_id: 'turn-9',
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      repoRoot: tmpRoot,
      source: CODEX_SOURCE,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    expect(event).not.toBeNull();
    if (!event) {
      return;
    }
    expect(event.source).toBe('codex');
    expect(event.skill_name).toBe('ot-plans');
    expect(event.scope).toBe('ours');
    expect(event.invocation_path).toBe('slash');
  });
  it('builds a codex sourced skill_read event from a PreToolUse payload', () => {
    const normalized = normalizeCodexPayload({
      cwd: tmpRoot,
      hook_event_name: 'PreToolUse',
      session_id: 'sess-10',
      tool_input: { command: 'cat skills/ot-plans/SKILL.md' },
      tool_name: 'Bash',
      tool_use_id: 'exec-10',
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      repoRoot: tmpRoot,
      source: CODEX_SOURCE,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    expect(event).toMatchObject({
      invocation_path: 'skill_read',
      scope: 'ours',
      skill_name: 'ot-plans',
      source: 'codex',
      tool_use_id: 'exec-10',
    });
  });
});
