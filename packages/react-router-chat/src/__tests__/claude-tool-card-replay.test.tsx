/**
 * End-to-end guard for the claude "No payload." regression: the wire shapes the
 * claude mapper emits, folded by {@link foldPersistedTurnEvents} and rendered
 * through the real {@link ChatToolCall}, must show Arguments and Result.
 *
 * The mapper's own tests prove claude stream events become these chunks, and
 * turn-events.test.ts proves the fold's field-level behaviour. Neither asserts
 * what the CARD ends up displaying, which is the thing the bug was reported as
 * — so this one spans fold -> component and reads the rendered DOM.
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

/** Replay a persisted turn and keep only its tool cards, in timeline order. */
const replayToolEvents = (
  toolMetadataJson: string,
): readonly ChatTurnToolEvent[] => {
  return foldPersistedTurnEvents(toolMetadataJson, '').filter(isToolEvent);
};

/** The text a single card renders when fully expanded. */
const cardText = (event: ChatTurnToolEvent): string => {
  return (
    render(<ChatToolCall defaultOpen={true} event={event} />).container
      .textContent ?? ''
  );
};

// --- The shape the claude mapper emits today -------------------------------

/** `content_block_start` opens the card: a callId and a name, but no input. */
const toolCallStart = (
  callId: string,
  toolName: string,
  index: number,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, index, name: toolName, toolName },
  };
};

/** The consolidated `assistant` event carries the complete arguments. */
const toolCallArgs = (
  callId: string,
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, name: toolName, toolCall: input, toolName },
  };
};

/** One `tool_result` block, correlated to its call by `tool_use_id`. */
const toolResult = (
  callId: string,
  content: string,
  isError = false,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_result',
    metadata: { callId, isError, toolCall: content },
  };
};

describe('claude tool cards (persisted replay)', () => {
  describe('current wire shape', () => {
    test('a single call renders its arguments and its result, not "No payload."', () => {
      const [event] = replayToolEvents(
        persisted([
          toolCallStart('toolu_01', 'Read', 0),
          toolCallArgs('toolu_01', 'Read', { file_path: '/tmp/a.ts' }),
          toolResult('toolu_01', 'export const a = 1;'),
        ]),
      );

      expect(event).toBeDefined();
      if (event === undefined) {
        return;
      }

      expect(event.status).toBe('succeeded');

      const text = cardText(event);
      expect(text).toContain('Arguments');
      expect(text).toContain('/tmp/a.ts');
      expect(text).toContain('Result');
      expect(text).toContain('export const a = 1;');
      expect(text).not.toContain('No payload.');
    });

    test('a parallel batch resolves each card to its OWN result, none left running', () => {
      // Results come back in a different order than the calls went out, which
      // is exactly what the old positional correlation got wrong.
      const events = replayToolEvents(
        persisted([
          toolCallStart('toolu_a', 'Bash', 0),
          toolCallStart('toolu_b', 'Bash', 1),
          toolCallStart('toolu_c', 'Bash', 2),
          toolCallArgs('toolu_a', 'Bash', { command: 'echo alpha' }),
          toolCallArgs('toolu_b', 'Bash', { command: 'echo bravo' }),
          toolCallArgs('toolu_c', 'Bash', { command: 'echo charlie' }),
          toolResult('toolu_c', 'charlie'),
          toolResult('toolu_a', 'alpha'),
          toolResult('toolu_b', 'bravo'),
        ]),
      );

      expect(events).toHaveLength(3);
      expect(events.every((event) => event.status === 'succeeded')).toBe(true);

      const pairs = events.map((event) => ({
        callId: event.callId,
        text: cardText(event),
      }));

      for (const [callId, command, output] of [
        ['toolu_a', 'echo alpha', 'alpha'],
        ['toolu_b', 'echo bravo', 'bravo'],
        ['toolu_c', 'echo charlie', 'charlie'],
      ]) {
        const pair = pairs.find((candidate) => candidate.callId === callId);
        expect(pair).toBeDefined();
        expect(pair?.text).toContain(command);
        expect(pair?.text).toContain(output);
      }
    });

    test('an is_error result fails that card and shows the error', () => {
      const [event] = replayToolEvents(
        persisted([
          toolCallStart('toolu_err', 'Read', 0),
          toolCallArgs('toolu_err', 'Read', { file_path: '/nope.ts' }),
          toolResult('toolu_err', 'File does not exist.', true),
        ]),
      );

      expect(event).toBeDefined();
      if (event === undefined) {
        return;
      }

      expect(event.status).toBe('failed');

      const component = render(
        <ChatToolCall defaultOpen={true} event={event} />,
      );
      expect(component.getByRole('alert')).toHaveTextContent(
        'File does not exist.',
      );
      expect(component.getByText('failed')).toBeInTheDocument();
    });

    test('an MCP tool keeps its fully-qualified name on the card', () => {
      const [event] = replayToolEvents(
        persisted([
          toolCallStart('toolu_mcp', 'mcp__openthrottle-mcp__get_plan', 0),
          toolCallArgs('toolu_mcp', 'mcp__openthrottle-mcp__get_plan', {
            id: '0f19d38d',
          }),
          toolResult('toolu_mcp', '{"plan":{"status":"IN_PROGRESS"}}'),
        ]),
      );

      expect(event).toBeDefined();
      if (event === undefined) {
        return;
      }

      const text = cardText(event);
      expect(text).toContain('mcp__openthrottle-mcp__get_plan');
      // Both halves: the arguments were the side that stayed blank pre-fix.
      expect(text).toContain('Arguments');
      expect(text).toContain('0f19d38d');
      expect(text).toContain('Result');
      expect(text).toContain('IN_PROGRESS');
      expect(text).not.toContain('No payload.');
    });
  });

  describe('legacy wire shape (persisted before the mapper fix)', () => {
    test('a turn persisted as toolUseId + partialJson + toolResults still renders', () => {
      const [event] = replayToolEvents(
        persisted([
          {
            delta: '',
            kind: 'tool_call',
            metadata: {
              index: 0,
              name: 'Read',
              toolName: 'Read',
              toolUseId: 'toolu_legacy',
            },
          },
          {
            delta: '',
            kind: 'tool_call',
            metadata: { index: 0, partialJson: '{"file_path":' },
          },
          {
            delta: '',
            kind: 'tool_call',
            metadata: { index: 0, partialJson: '"/tmp/legacy.ts"}' },
          },
          {
            delta: '',
            kind: 'tool_result',
            metadata: {
              toolResults: [
                {
                  content: [{ text: 'legacy body', type: 'text' }],
                  tool_use_id: 'toolu_legacy',
                  type: 'tool_result',
                },
              ],
            },
          },
        ]),
      );

      expect(event).toBeDefined();
      if (event === undefined) {
        return;
      }

      expect(event.status).toBe('succeeded');

      const text = cardText(event);
      expect(text).toContain('Arguments');
      expect(text).toContain('/tmp/legacy.ts');
      expect(text).toContain('Result');
      expect(text).toContain('legacy body');
      expect(text).not.toContain('No payload.');
    });

    test('a legacy parallel batch resolves each block by its own tool_use_id', () => {
      const events = replayToolEvents(
        persisted([
          {
            delta: '',
            kind: 'tool_call',
            metadata: {
              index: 0,
              name: 'Bash',
              toolName: 'Bash',
              toolUseId: 'toolu_1',
            },
          },
          {
            delta: '',
            kind: 'tool_call',
            metadata: {
              index: 1,
              name: 'Bash',
              toolName: 'Bash',
              toolUseId: 'toolu_2',
            },
          },
          {
            delta: '',
            kind: 'tool_result',
            metadata: {
              toolResults: [
                {
                  content: 'second',
                  tool_use_id: 'toolu_2',
                  type: 'tool_result',
                },
                {
                  content: 'first',
                  tool_use_id: 'toolu_1',
                  type: 'tool_result',
                },
              ],
            },
          },
        ]),
      );

      expect(events).toHaveLength(2);
      expect(events.every((event) => event.status === 'succeeded')).toBe(true);

      const first = events.find((event) => event.callId === 'toolu_1');
      const second = events.find((event) => event.callId === 'toolu_2');

      expect(first).toBeDefined();
      expect(second).toBeDefined();
      if (first === undefined || second === undefined) {
        return;
      }

      expect(cardText(first)).toContain('first');
      expect(cardText(second)).toContain('second');
    });
  });
});
