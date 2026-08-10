/**
 * Unit tests for the Claude Code adapter payload normalization + the seam
 * contract (normalized invocation + CLAUDE_SOURCE → source-stamped event).
 * Ported from `.claude/hooks/skill-usage-claude-adapter.test.cjs`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildUsageEvent } from '../../../index';
import {
  CLAUDE_SOURCE,
  normalizeClaudePayload,
  normalizeClaudeStopPayload,
} from '../payload';

describe('normalizeClaudePayload', () => {
  it('maps PreToolUse Skill tool_input', () => {
    const normalized = normalizeClaudePayload({
      cwd: '/tmp/repo',
      hook_event_name: 'PreToolUse',
      prompt_id: 'p1',
      session_id: 'sess-1',
      tool_input: { args: 'with logo', skill: 'create-readme' },
      tool_name: 'Skill',
      tool_use_id: 'toolu_1',
    });
    expect(normalized).toEqual({
      args: 'with logo',
      cwd: '/tmp/repo',
      hook_event_name: 'PreToolUse',
      invocation_path: 'skill_tool',
      prompt_id: 'p1',
      session_id: 'sess-1',
      skill_name: 'create-readme',
      tool_use_id: 'toolu_1',
    });
  });

  it('maps UserPromptExpansion slash_command', () => {
    const normalized = normalizeClaudePayload({
      command_args: 'PONG',
      command_name: 'nx-workspace',
      cwd: '/tmp/repo',
      expansion_type: 'slash_command',
      hook_event_name: 'UserPromptExpansion',
      session_id: 'sess-2',
    });
    expect(normalized?.skill_name).toBe('nx-workspace');
    expect(normalized?.args).toBe('PONG');
    expect(normalized?.invocation_path).toBe('slash');
  });

  it('returns null for unrelated payloads', () => {
    expect(normalizeClaudePayload({ hook_event_name: 'Stop' })).toBeNull();
  });
});

describe('normalizeClaudeStopPayload', () => {
  it('extracts session id from a Stop payload', () => {
    expect(
      normalizeClaudeStopPayload({
        hook_event_name: 'Stop',
        session_id: 'sess-stop',
        stop_hook_active: false,
      }),
    ).toEqual({ hook_event_name: 'Stop', session_id: 'sess-stop' });
  });

  it('preserves SubagentStop event name', () => {
    expect(
      normalizeClaudeStopPayload({
        hook_event_name: 'SubagentStop',
        session_id: 'sess-sub',
      })?.hook_event_name,
    ).toBe('SubagentStop');
  });

  it('returns null when session id is missing', () => {
    expect(normalizeClaudeStopPayload({ hook_event_name: 'Stop' })).toBeNull();
    expect(normalizeClaudeStopPayload(null)).toBeNull();
  });
});

describe('adapter seam → source-stamped event', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-adapter-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a claude-code sourced event from a Claude payload', () => {
    const normalized = normalizeClaudePayload({
      cwd: tmpRoot,
      hook_event_name: 'PreToolUse',
      session_id: 'sess-9',
      tool_input: { args: 'ping', skill: 'ot-plans' },
      tool_name: 'Skill',
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      repoRoot: tmpRoot,
      source: CLAUDE_SOURCE,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    expect(event).not.toBeNull();
    if (!event) {
      return;
    }
    expect(event.source).toBe('claude-code');
    expect(event.skill_name).toBe('ot-plans');
    expect(event.scope).toBe('ours');
    expect(event.invocation_path).toBe('skill_tool');
  });
});
