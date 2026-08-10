/**
 * Unit tests for event construction + GraphQL input mapping (`data/events`).
 * Split out of the original package-wide `lib.test.ts` so each source module
 * owns its own spec. Also exercises `appendJsonl` (`data/jsonl`) as the
 * build→persist integration for `buildUsageEvent`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  appendJsonl,
  buildOutcomeEvent,
  buildUsageEvent,
  PRIVACY_LEVELS,
  SKILL_USAGE_OUTCOMES,
  toRecordSkillUsageInput,
  toRecordSkillUsageOutcomeInput,
} from '../../index';
import type { OutcomeEvent, UsageEvent } from '../../types';

describe('buildUsageEvent + appendJsonl', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-event-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a truncated ours event, stamps source, and appends JSONL', () => {
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized: {
        args: `Bearer secret-token-value ${'z'.repeat(300)}`,
        cwd: tmpRoot,
        invocation_path: 'skill_tool',
        session_id: 'sess-3',
        skill_name: 'ot-plans',
      },
      privacyLevel: PRIVACY_LEVELS.TRUNCATED,
      repoRoot: tmpRoot,
      source: 'claude-code',
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    expect(event).not.toBeNull();
    if (!event) {
      return;
    }
    expect(event.skill_name).toBe('ot-plans');
    expect(event.source).toBe('claude-code');
    expect(event.scope).toBe('ours');
    expect(event.privacy_level).toBe('truncated');
    expect(event.git_branch).toBe('example-usage-tracking');
    const args = event.args ?? '';
    expect(args).toContain('[REDACTED]');
    expect(args).not.toContain('secret-token-value');
    expect(args.length).toBeLessThanOrEqual(257);

    const jsonlPath = path.join(
      tmpRoot,
      '.cache',
      'skill-usage',
      'events.jsonl',
    );
    appendJsonl(jsonlPath, event);
    appendJsonl(jsonlPath, { ...event, skill_name: 'second' });

    const lines = fs
      .readFileSync(jsonlPath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(lines.length).toBe(2);
    expect(lines[0].skill_name).toBe('ot-plans');
    expect(lines[1].skill_name).toBe('second');
  });
});

describe('toRecordSkillUsageInput', () => {
  it('maps snake_case JSONL event to camelCase GraphQL input', () => {
    const event: UsageEvent = {
      agent_id: 'a1',
      agent_type: 'general-purpose',
      args: 'hello',
      cwd: '/tmp',
      git_branch: 'main',
      hook_event_name: 'PreToolUse',
      invocation_path: 'skill_tool',
      privacy_level: 'truncated',
      prompt_id: 'p1',
      scope: 'ours',
      session_id: 'sess',
      skill_name: 'ot-plans',
      source: 'claude-code',
      timestamp: '2026-08-01T00:00:00.000Z',
      tool_use_id: 't1',
    };
    expect(toRecordSkillUsageInput(event)).toEqual({
      agentId: 'a1',
      agentType: 'general-purpose',
      args: 'hello',
      cwd: '/tmp',
      gitBranch: 'main',
      hookEventName: 'PreToolUse',
      invocationPath: 'skill_tool',
      occurredAt: '2026-08-01T00:00:00.000Z',
      privacyLevel: 'truncated',
      promptId: 'p1',
      scope: 'ours',
      sessionId: 'sess',
      skillName: 'ot-plans',
      source: 'claude-code',
      toolUseId: 't1',
    });
  });
});

describe('buildOutcomeEvent', () => {
  let tmpRoot: string;
  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-outcome-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });
  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds an ours-scoped outcome correlated by session + skill', () => {
    const event = buildOutcomeEvent({
      durationMs: 4200.6,
      outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
      repoRoot: tmpRoot,
      sessionId: 'sess-1',
      skillName: 'ot-plans',
      timestamp: '2026-08-01T12:00:00.000Z',
      toolUseId: 'tool-1',
    });
    expect(event).not.toBeNull();
    if (!event) {
      return;
    }
    expect(event.skill_name).toBe('ot-plans');
    expect(event.session_id).toBe('sess-1');
    expect(event.tool_use_id).toBe('tool-1');
    expect(event.outcome).toBe('success');
    expect(event.duration_ms).toBe(4201);
    expect(event.scope).toBe('ours');
    expect(event.event_kind).toBe('outcome');
  });

  it('rejects invalid outcome values', () => {
    expect(
      buildOutcomeEvent({
        // Deliberately invalid to exercise the runtime guard.
        outcome: 'done',
        repoRoot: tmpRoot,
        skillName: 'ot-plans',
      }),
    ).toBeNull();
  });
});

describe('toRecordSkillUsageOutcomeInput', () => {
  const sampleOutcome: OutcomeEvent = {
    cwd: '/tmp',
    duration_ms: 4200,
    event_kind: 'outcome',
    git_branch: 'example-usage-tracking',
    outcome: 'success',
    scope: 'ours',
    session_id: 'sess-1',
    skill_name: 'ot-plans',
    timestamp: '2026-08-01T12:00:00.000Z',
    tool_use_id: 'tool-1',
  };

  it('maps snake_case outcome event to GraphQL input', () => {
    expect(toRecordSkillUsageOutcomeInput(sampleOutcome)).toEqual({
      cwd: '/tmp',
      durationMs: 4200,
      gitBranch: 'example-usage-tracking',
      occurredAt: '2026-08-01T12:00:00.000Z',
      outcome: 'success',
      scope: 'ours',
      sessionId: 'sess-1',
      skillName: 'ot-plans',
      toolUseId: 'tool-1',
    });
  });
});
