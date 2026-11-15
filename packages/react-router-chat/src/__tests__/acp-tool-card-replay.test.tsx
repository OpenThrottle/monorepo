/**
 * End-to-end guard for ACP tool cards (cursor-agent, agy): the chunks the ACP
 * update mapper emits for `tool_call` / `tool_call_update` notifications,
 * folded by {@link foldPersistedTurnEvents} and rendered through the real
 * {@link ChatToolCall}, must show each call's own Arguments and Result, render
 * a failed call as failed with its readable error, and leave nothing running.
 *
 * Before the fix (plan f2bfd71d) the mapper never set `metadata.isError`, so a
 * `failed` update rendered as succeeded with a `{ output, status: "failed" }`
 * blob as its Result. The chunks below mirror what `createAcpUpdateMapper`
 * emits in openthrottle-agentic-utils (which this browser package cannot
 * import); that mapper's own tests prove the notifications become these chunks.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatToolCall } from '../components/ChatToolCall';
import { foldPersistedTurnEvents } from '../turn-events';
import type { ChatTurnEvent, ChatTurnToolEvent } from '../types';

/** A persisted `toolMetadata` blob holding the server's saved event array. */
const persisted = (events: ReadonlyArray<Record<string, unknown>>): string => {
  return JSON.stringify({ events });
};

const isToolEvent = (event: ChatTurnEvent): event is ChatTurnToolEvent => {
  return event.kind === 'tool';
};

/** The text a single card renders when fully expanded. */
const cardText = (event: ChatTurnToolEvent): string => {
  return (
    render(<ChatToolCall defaultOpen={true} event={event} />).container
      .textContent ?? ''
  );
};

// --- The shapes the ACP mapper emits -----------------------------------------

/** The held `tool_call` chunk: emitted once the call's `rawInput` is known. */
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

/** A `completed` update: `{ output, status }`, `isError` false. */
const completed = (
  callId: string,
  toolName: string,
  output: unknown,
): Record<string, unknown> => {
  return {
    delta: '',
    error: null,
    kind: 'tool_result',
    metadata: {
      callId,
      isError: false,
      toolCall: { output, status: 'completed' },
      toolName,
    },
  };
};

/** A `failed` update: its readable error text, `isError` true. */
const failed = (
  callId: string,
  toolName: string,
  errorText: string,
): Record<string, unknown> => {
  return {
    delta: '',
    error: errorText,
    kind: 'tool_result',
    metadata: { callId, isError: true, toolCall: errorText, toolName },
  };
};

const MISSING_ERROR = 'cat: does-not-exist.txt: No such file or directory';

const TURN = persisted([
  toolCall('c1', 'Read File', { path: '/repo/package.json' }),
  toolCall('c2', 'Shell', { command: 'cat does-not-exist.txt' }),
  failed('c2', 'Shell', MISSING_ERROR),
  completed('c1', 'Read File', { content: '"name": "monorepo"' }),
  {
    delta: '',
    kind: 'usage',
    metadata: { stopReason: 'end_turn' },
  },
]);

describe('ACP tool cards (persisted replay)', () => {
  test('each call renders one card with its own arguments and result', () => {
    const events = foldPersistedTurnEvents(TURN, '').filter(isToolEvent);

    expect(
      events.map((event) => {
        return event.callId;
      }),
    ).toEqual(['c1', 'c2']);
    expect(
      events.some((event) => {
        return event.status === 'running';
      }),
    ).toBe(false);

    const read = events.find((event) => {
      return event.callId === 'c1';
    });
    expect(read?.status).toBe('succeeded');
    if (read === undefined) {
      return;
    }

    const text = cardText(read);
    expect(text).toContain('package.json');
    expect(text).toContain('Result');
    expect(text).toContain('monorepo');
    expect(text).not.toContain('No payload.');
  });

  test('a failed call renders as failed with its readable error', () => {
    const shell = foldPersistedTurnEvents(TURN, '')
      .filter(isToolEvent)
      .find((event) => {
        return event.callId === 'c2';
      });

    expect(shell?.status).toBe('failed');
    if (shell === undefined) {
      return;
    }

    const component = render(<ChatToolCall defaultOpen={true} event={shell} />);
    expect(component.getByRole('alert')).toHaveTextContent(MISSING_ERROR);
    expect(component.getByText('failed')).toBeInTheDocument();
    expect(component.container.textContent).not.toContain('"status"');
  });
});
