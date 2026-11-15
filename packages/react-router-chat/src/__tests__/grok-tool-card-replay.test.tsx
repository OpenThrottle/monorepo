/**
 * End-to-end guard for grok tool cards: the chunks the grok mapper emits for
 * grok 1.x `tool_call` / `tool_call_update` events, folded by
 * {@link foldPersistedTurnEvents} and rendered through the real
 * {@link ChatToolCall}, must show each parallel call's own Arguments and
 * Result, render a failed call as failed, leave nothing running, and show the
 * reason a permission-cancelled turn stopped.
 *
 * Before the fix (plan 9fe4be04) the mapper dropped every tool event, so no
 * card rendered, and a cancelled turn persisted a normal-looking usage payload
 * with no reason. The chunks below mirror what `createGrokEventMapper` emits in
 * openthrottle-agentic-utils (which this browser package cannot import) for the
 * live grok 1.0.77 streams captured there; that mapper's own tests prove the
 * events become these chunks.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatToolCall } from '../components/ChatToolCall';
import { ChatTurnUsageSummary } from '../components/ChatTurnUsageSummary';
import { foldPersistedTurnEvents } from '../turn-events';
import type {
  ChatTurnEvent,
  ChatTurnToolEvent,
  ChatTurnUsageEvent,
} from '../types';

/** A persisted `toolMetadata` blob holding the server's saved event array. */
const persisted = (events: ReadonlyArray<Record<string, unknown>>): string => {
  return JSON.stringify({ events });
};

const isToolEvent = (event: ChatTurnEvent): event is ChatTurnToolEvent => {
  return event.kind === 'tool';
};

const isUsageEvent = (event: ChatTurnEvent): event is ChatTurnUsageEvent => {
  return event.kind === 'usage';
};

/** The text a single card renders when fully expanded. */
const cardText = (event: ChatTurnToolEvent): string => {
  return (
    render(<ChatToolCall defaultOpen={true} event={event} />).container
      .textContent ?? ''
  );
};

// --- The shapes the grok mapper emits ----------------------------------------

/** A `tool_call` event: the call opens with its `rawInput`. */
const toolCall = (
  callId: string,
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, toolCall: input, toolName },
  };
};

/** The terminal `tool_call_update`: its content text, `isError` on `failed`. */
const toolResult = (
  callId: string,
  toolName: string,
  content: string,
  isError = false,
): Record<string, unknown> => {
  return {
    delta: '',
    error: isError ? content : null,
    kind: 'tool_result',
    metadata: { callId, isError, toolCall: content, toolName },
  };
};

const MISSING = '/repo/does-not-exist/missing.txt';
const MISSING_ERROR = `Error: ${MISSING} does not exist.`;
const BLOCKED = 'User cancelled the execution for tool `run_terminal_command`';
const CANCELLED_NOTICE = `grok stopped before replying: \`run_terminal_command\` needed approval, which a headless run cannot ask for.`;

/** The captured parallel turn: three calls opened, then closed out of order. */
const PARALLEL_TURN = persisted([
  toolCall('call-0', 'run_terminal_command', {
    command: 'pwd',
    description: 'Print the current working directory',
  }),
  toolCall('call-1', 'read_file', { limit: 3, target_file: 'package.json' }),
  toolCall('call-2', 'read_file', {
    target_file: 'does-not-exist/missing.txt',
  }),
  toolResult('call-2', 'read_file', MISSING_ERROR, true),
  toolResult('call-1', 'read_file', '1→{\n  "name": "monorepo",'),
  toolResult('call-0', 'run_terminal_command', '/repo\n'),
  {
    delta: '',
    kind: 'usage',
    metadata: { stopReason: 'end_turn', usage: { total_tokens: 72044 } },
  },
]);

describe('grok tool cards (persisted replay)', () => {
  test('parallel calls render one card each with their own arguments and result', () => {
    const events = foldPersistedTurnEvents(PARALLEL_TURN, '').filter(
      isToolEvent,
    );

    expect(
      events.map((event) => {
        return event.callId;
      }),
    ).toEqual(['call-0', 'call-1', 'call-2']);
    expect(
      events.some((event) => {
        return event.status === 'running';
      }),
    ).toBe(false);

    for (const [callId, argument, output] of [
      ['call-0', 'pwd', '/repo'],
      ['call-1', 'package.json', 'monorepo'],
    ]) {
      const event = events.find((candidate) => {
        return candidate.callId === callId;
      });
      expect(event?.status).toBe('succeeded');
      if (event === undefined) {
        return;
      }

      const text = cardText(event);
      expect(text).toContain(argument);
      expect(text).toContain('Result');
      expect(text).toContain(output);
      expect(text).not.toContain('No payload.');
    }
  });

  test('a failed call renders as failed with its error text', () => {
    const missing = foldPersistedTurnEvents(PARALLEL_TURN, '')
      .filter(isToolEvent)
      .find((event) => {
        return event.callId === 'call-2';
      });

    expect(missing?.status).toBe('failed');
    if (missing === undefined) {
      return;
    }

    const component = render(
      <ChatToolCall defaultOpen={true} event={missing} />,
    );
    expect(component.getByRole('alert')).toHaveTextContent(MISSING_ERROR);
    expect(component.getByText('failed')).toBeInTheDocument();
  });

  test('a normal end_turn shows no error notice', () => {
    const usage = foldPersistedTurnEvents(PARALLEL_TURN, '').find(isUsageEvent);

    expect(usage?.error).toBeNull();
  });

  test('a permission-cancelled turn shows why it stopped, beside its cards', () => {
    const events = foldPersistedTurnEvents(
      persisted([
        toolCall('call-0', 'run_terminal_command', { command: 'pwd' }),
        toolCall('call-1', 'run_terminal_command', { command: 'rm -f x' }),
        toolResult('call-1', 'run_terminal_command', BLOCKED, true),
        toolResult('call-0', 'run_terminal_command', '/repo\n'),
        {
          delta: '',
          kind: 'usage',
          metadata: { error: CANCELLED_NOTICE, stopReason: 'cancelled' },
        },
      ]),
      '',
    );

    const tools = events.filter(isToolEvent);
    expect(
      tools.map((event) => {
        return event.status;
      }),
    ).toEqual(['succeeded', 'failed']);

    const usage = events.find(isUsageEvent);
    expect(usage).toBeDefined();
    if (usage === undefined) {
      return;
    }

    const component = render(<ChatTurnUsageSummary event={usage} />);
    expect(component.getByRole('alert')).toHaveTextContent(
      '`run_terminal_command` needed approval',
    );
  });
});
