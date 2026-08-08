/**
 * Unit tests for the Claude Code skill-usage adapter (node:test, no Nx project).
 * Run: node --test .claude/hooks/skill-usage-claude-adapter.test.cjs
 *
 * Covers the Claude-specific payload normalization plus the seam contract that
 * a normalized invocation + CLAUDE_SOURCE builds a source-stamped neutral event.
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, before, after } = require('node:test');

const {
  CLAUDE_SOURCE,
  normalizeClaudePayload,
  normalizeClaudeStopPayload,
} = require('./skill-usage-claude-adapter.cjs');
const { buildUsageEvent } = require('../../.agents/hooks/skill-usage/lib.cjs');

describe('normalizeClaudePayload', () => {
  it('maps PreToolUse Skill tool_input', () => {
    const normalized = normalizeClaudePayload({
      hook_event_name: 'PreToolUse',
      tool_name: 'Skill',
      tool_input: { skill: 'create-readme', args: 'with logo' },
      session_id: 'sess-1',
      cwd: '/tmp/repo',
      tool_use_id: 'toolu_1',
      prompt_id: 'p1',
    });
    assert.deepEqual(normalized, {
      skill_name: 'create-readme',
      args: 'with logo',
      session_id: 'sess-1',
      cwd: '/tmp/repo',
      invocation_path: 'skill_tool',
      tool_use_id: 'toolu_1',
      prompt_id: 'p1',
      hook_event_name: 'PreToolUse',
    });
  });

  it('maps UserPromptExpansion slash_command', () => {
    const normalized = normalizeClaudePayload({
      hook_event_name: 'UserPromptExpansion',
      expansion_type: 'slash_command',
      command_name: 'nx-workspace',
      command_args: 'PONG',
      session_id: 'sess-2',
      cwd: '/tmp/repo',
    });
    assert.equal(normalized?.skill_name, 'nx-workspace');
    assert.equal(normalized?.args, 'PONG');
    assert.equal(normalized?.invocation_path, 'slash');
  });

  it('returns null for unrelated payloads', () => {
    assert.equal(normalizeClaudePayload({ hook_event_name: 'Stop' }), null);
  });
});

describe('normalizeClaudeStopPayload', () => {
  it('extracts session id from a Stop payload', () => {
    assert.deepEqual(
      normalizeClaudeStopPayload({
        hook_event_name: 'Stop',
        session_id: 'sess-stop',
        stop_hook_active: false,
      }),
      { hook_event_name: 'Stop', session_id: 'sess-stop' },
    );
  });

  it('preserves SubagentStop event name', () => {
    assert.equal(
      normalizeClaudeStopPayload({
        hook_event_name: 'SubagentStop',
        session_id: 'sess-sub',
      })?.hook_event_name,
      'SubagentStop',
    );
  });

  it('returns null when session id is missing', () => {
    assert.equal(normalizeClaudeStopPayload({ hook_event_name: 'Stop' }), null);
    assert.equal(normalizeClaudeStopPayload(null), null);
  });
});

describe('adapter seam → source-stamped event', () => {
  /** @type {string} */
  let tmpRoot;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-adapter-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a claude-code sourced event from a Claude payload', () => {
    const normalized = normalizeClaudePayload({
      hook_event_name: 'PreToolUse',
      tool_name: 'Skill',
      tool_input: { skill: 'ot-plans', args: 'ping' },
      session_id: 'sess-9',
      cwd: tmpRoot,
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      repoRoot: tmpRoot,
      source: CLAUDE_SOURCE,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    assert.ok(event);
    assert.equal(event.source, 'claude-code');
    assert.equal(event.skill_name, 'ot-plans');
    assert.equal(event.scope, 'ours');
    assert.equal(event.invocation_path, 'skill_tool');
  });
});
