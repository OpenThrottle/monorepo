/**
 * Skill extraction from transcript lines. The line shapes are assembled from
 * the documented transcript structure (a `Skill` `tool_use` block; a user line
 * of `<command-*>` tags answered by a `<local-command-stdout>` line for a
 * built-in command), with synthetic ids and no real content.
 */
import { describe, expect, it } from 'vitest';

import {
  createSkillScanState,
  finishSkillScan,
  scanSkillLines,
} from '../transcript-skills.ts';

const SESSION = '00000000-0000-4000-8000-000000000001';

const scan = (lines: readonly string[]) => {
  const state = createSkillScanState();
  scanSkillLines({ fallbackSessionId: 'fallback-session', lines, state });
  return finishSkillScan(state);
};

const skillCall = (
  overrides: { agentId?: string; id?: string | null; input?: unknown } = {},
): string =>
  JSON.stringify({
    ...(overrides.agentId === undefined ? {} : { agentId: overrides.agentId }),
    cwd: '/repo',
    gitBranch: 'feat/example',
    message: {
      content: [
        {
          id: overrides.id === null ? undefined : (overrides.id ?? 'toolu_1'),
          input: overrides.input ?? {
            args: 'with logo',
            skill: 'create-readme',
          },
          name: 'Skill',
          type: 'tool_use',
        },
      ],
      role: 'assistant',
    },
    sessionId: SESSION,
    timestamp: '2026-10-01T10:00:00.000Z',
    type: 'assistant',
  });

const command = (
  overrides: { promptId?: string; uuid?: string; text?: string } = {},
): string =>
  JSON.stringify({
    cwd: '/repo',
    gitBranch: 'feat/example',
    message: {
      content:
        overrides.text ??
        '<command-message>nx-workspace</command-message>\n<command-name>/nx-workspace</command-name>\n<command-args>what projects</command-args>',
      role: 'user',
    },
    ...(overrides.promptId === undefined
      ? {}
      : { promptId: overrides.promptId }),
    sessionId: SESSION,
    timestamp: '2026-10-01T11:00:00.000Z',
    type: 'user',
    uuid: overrides.uuid ?? 'user-line-1',
  });

describe('a Skill tool call', () => {
  it('becomes the invocation the live PreToolUse hook would have produced', () => {
    expect(scan([skillCall()])).toEqual([
      {
        gitBranch: 'feat/example',
        keyedByFallback: false,
        normalized: {
          args: 'with logo',
          cwd: '/repo',
          hook_event_name: 'PreToolUse',
          invocation_path: 'skill_tool',
          session_id: SESSION,
          skill_name: 'create-readme',
          tool_use_id: 'toolu_1',
        },
        occurredAt: '2026-10-01T10:00:00.000Z',
      },
    ]);
  });

  it('carries the subagent id of a subagent transcript line', () => {
    const [candidate] = scan([skillCall({ agentId: 'a1' })]);
    expect(candidate?.normalized.agent_id).toBe('a1');
  });

  it('is dropped when the block has no id, because it would have no idempotency key', () => {
    expect(scan([skillCall({ id: null })])).toEqual([]);
  });

  it('is dropped when the input names no skill', () => {
    expect(scan([skillCall({ input: {} })])).toEqual([]);
  });

  it('ignores other tools and non-assistant lines', () => {
    const bash = JSON.stringify({
      message: {
        content: [{ id: 't', input: {}, name: 'Bash', type: 'tool_use' }],
      },
      timestamp: '2026-10-01T10:00:00.000Z',
      type: 'assistant',
    });
    const quoted = JSON.stringify({
      message: { content: 'the "Skill" tool', role: 'user' },
      timestamp: '2026-10-01T10:00:00.000Z',
      type: 'user',
    });
    expect(scan([bash, quoted])).toEqual([]);
  });
});

describe('a slash command', () => {
  it('becomes the invocation the live UserPromptExpansion hook would have produced', () => {
    const [candidate] = scan([command({ promptId: 'prompt-1' })]);
    expect(candidate).toEqual({
      gitBranch: 'feat/example',
      keyedByFallback: false,
      normalized: {
        args: 'what projects',
        cwd: '/repo',
        hook_event_name: 'UserPromptExpansion',
        invocation_path: 'slash',
        prompt_id: 'prompt-1',
        session_id: SESSION,
        skill_name: 'nx-workspace',
      },
      occurredAt: '2026-10-01T11:00:00.000Z',
    });
  });

  it('is keyed by the line uuid, and says so, when the line has no promptId', () => {
    const [candidate] = scan([command()]);
    expect(candidate?.normalized.prompt_id).toBe('user-line-1');
    expect(candidate?.keyedByFallback).toBe(true);
  });

  it('is dropped when a built-in command: its line was answered by local stdout', () => {
    const reply = JSON.stringify({
      message: { content: '<local-command-stdout></local-command-stdout>' },
      parentUuid: 'user-line-1',
      timestamp: '2026-10-01T11:00:01.000Z',
      type: 'user',
    });
    expect(scan([command({ promptId: 'p' }), reply])).toEqual([]);
  });

  it('ignores a message that merely quotes the tags mid-text', () => {
    expect(
      scan([
        command({ text: 'see <command-name>/x</command-name> in the log' }),
      ]),
    ).toEqual([]);
  });

  it('reads the text blocks of an array message', () => {
    const line = JSON.stringify({
      message: {
        content: [
          { text: '<command-name>/grilling</command-name>', type: 'text' },
        ],
      },
      promptId: 'p2',
      sessionId: SESSION,
      timestamp: '2026-10-01T11:00:00.000Z',
      type: 'user',
      uuid: 'u2',
    });
    expect(scan([line])[0]?.normalized.skill_name).toBe('grilling');
  });
});

describe('malformed input', () => {
  it('skips lines that are not JSON, including a truncated tail', () => {
    expect(scan(['not json "Skill"', skillCall().slice(0, 40)])).toEqual([]);
  });

  it('falls back to the session the file belongs to', () => {
    const line = JSON.stringify({
      message: {
        content: [
          { id: 't1', input: { skill: 's' }, name: 'Skill', type: 'tool_use' },
        ],
      },
      timestamp: '2026-10-01T10:00:00.000Z',
      type: 'assistant',
    });
    expect(scan([line])[0]?.normalized.session_id).toBe('fallback-session');
  });
});
