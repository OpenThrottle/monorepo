/**
 * Unit tests for the Codex adapter payload normalization + the seam contract.
 *
 * Positive cases run against payloads captured verbatim from `codex-cli 0.145.0`
 * (`./fixtures/`, paths scrubbed). See `docs/monorepo/codex-cli-hook-probe.md`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildUsageEvent } from '../../../index.ts';
import {
  CODEX_SOURCE,
  normalizeCodexPayload,
  normalizeCodexSessionEndPayload,
} from '../payload.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const fixture = (name: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(fixturesDir, `${name}.json`), 'utf8'));

describe('normalizeCodexPayload', () => {
  it('returns null for a captured plain prompt', () => {
    // The captured UserPromptSubmit is a plain sentence, not a slash command.
    expect(normalizeCodexPayload(fixture('user-prompt-submit'))).toBeNull();
  });

  it('maps a slash command on the captured envelope', () => {
    const captured = fixture('user-prompt-submit');
    const payload =
      typeof captured === 'object' && captured !== null
        ? { ...captured, prompt: '/ot-plans list the open plans' }
        : {};
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

  it('returns null for a PreToolUse payload', () => {
    // Codex's PreToolUse carries tool_name/tool_input, but which tool_name a
    // skill produces has not been captured. Until it has, this adapter must
    // report "not handled" rather than guess — see the probe doc.
    expect(
      normalizeCodexPayload({
        cwd: '/tmp/probe-repo',
        hook_event_name: 'PreToolUse',
        session_id: 'sess-1',
        tool_input: { command: 'ls' },
        tool_name: 'shell',
        tool_use_id: 'call-1',
      }),
    ).toBeNull();
  });

  it('returns null for non-records and unknown events', () => {
    expect(normalizeCodexPayload(null)).toBeNull();
    expect(normalizeCodexPayload({ hook_event_name: 'PreCompact' })).toBeNull();
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
});
