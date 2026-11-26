import { describe, expect, it } from 'vitest';

import type { ChatMessage, ChatTurnToolEvent } from '../../types';
import { CHAT_TOOL_STATUS } from '../../types';
import {
  describeAgentCall,
  findInFlightMessage,
  formatElapsed,
  isAgentTool,
  summarizeSessionRunning,
} from '../session-running';

const tool = (overrides: Partial<ChatTurnToolEvent>): ChatTurnToolEvent => {
  return {
    argsJson: null,
    callId: null,
    error: null,
    kind: 'tool',
    name: 'bash',
    resultJson: null,
    sortOrder: 1,
    status: CHAT_TOOL_STATUS.running,
    ...overrides,
  };
};

const message = (overrides: Partial<ChatMessage>): ChatMessage => {
  return { body: '', id: 'm', role: 'assistant', ...overrides };
};

describe('findInFlightMessage', () => {
  it('returns the last assistant message', () => {
    const messages = [
      message({ id: 'a' }),
      message({ id: 'b' }),
      message({ id: 'u', role: 'user' }),
    ];

    expect(findInFlightMessage(messages)?.id).toBe('b');
  });

  it('returns undefined without an assistant message', () => {
    expect(findInFlightMessage([message({ role: 'user' })])).toBeUndefined();
  });
});

describe('isAgentTool', () => {
  it('matches Task and Agent case-insensitively', () => {
    expect(isAgentTool(tool({ name: 'Task' }))).toBe(true);
    expect(isAgentTool(tool({ name: 'agent' }))).toBe(true);
  });

  it('rejects other tools', () => {
    expect(isAgentTool(tool({ name: 'read' }))).toBe(false);
  });
});

describe('describeAgentCall', () => {
  it('prefers description', () => {
    const argsJson = JSON.stringify({
      description: 'Audit',
      subagent_type: 'x',
    });

    expect(describeAgentCall(tool({ argsJson, name: 'Task' }))).toBe('Audit');
  });

  it('falls back to subagent_type', () => {
    const argsJson = JSON.stringify({ subagent_type: 'Explore' });

    expect(describeAgentCall(tool({ argsJson, name: 'Task' }))).toBe('Explore');
  });

  it('falls back to the name for null, malformed or non-object args', () => {
    expect(describeAgentCall(tool({ name: 'Task' }))).toBe('Task');
    expect(describeAgentCall(tool({ argsJson: '{oops', name: 'Task' }))).toBe(
      'Task',
    );
    expect(describeAgentCall(tool({ argsJson: '[1]', name: 'Task' }))).toBe(
      'Task',
    );
    expect(describeAgentCall(tool({ argsJson: '{}', name: 'Task' }))).toBe(
      'Task',
    );
  });
});

describe('summarizeSessionRunning', () => {
  it('is empty without running tools', () => {
    expect(summarizeSessionRunning([])).toEqual({
      agents: [],
      message: undefined,
      tools: [],
    });
  });

  it('splits running tools from agents in event order, skipping finished ones', () => {
    const summary = summarizeSessionRunning([
      message({
        events: [
          tool({ callId: 'c2', name: 'edit', sortOrder: 2 }),
          tool({ callId: 'c1', name: 'read', sortOrder: 1 }),
          tool({
            argsJson: JSON.stringify({ description: 'Dig' }),
            callId: 'c3',
            name: 'Task',
            sortOrder: 3,
          }),
          tool({
            name: 'grep',
            sortOrder: 4,
            status: CHAT_TOOL_STATUS.succeeded,
          }),
        ],
      }),
    ]);

    expect(summary.tools.map((item) => item.label)).toEqual(['read', 'edit']);
    expect(summary.agents.map((item) => item.label)).toEqual(['Dig']);
  });

  it('keys a call without an id by name and order', () => {
    const summary = summarizeSessionRunning([
      message({ events: [tool({ name: 'bash', sortOrder: 7 })] }),
    ]);

    expect(summary.tools[0]?.key).toBe('bash-7');
  });
});

describe('formatElapsed', () => {
  it('formats seconds, minutes and hours compactly', () => {
    expect(formatElapsed(42_000)).toBe('42s');
    expect(formatElapsed(185_000)).toBe('3m 05s');
    expect(formatElapsed(3_720_000)).toBe('1h 02m');
  });

  it('clamps negative input to 0s', () => {
    expect(formatElapsed(-5)).toBe('0s');
  });
});
