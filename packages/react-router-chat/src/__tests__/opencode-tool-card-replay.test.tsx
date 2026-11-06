/**
 * End-to-end guard for opencode tool cards: the chunks the opencode mapper emits
 * for opencode 1.18's `tool_use` events, folded by {@link foldPersistedTurnEvents}
 * and rendered through the real {@link ChatToolCall}, must show each call's own
 * Arguments and Result, and a failed call must render as failed.
 *
 * Before the fix the mapper dropped every `tool_use` event, so no card rendered
 * at all; once they mapped, the chunks still carried no `toolCall` payload and no
 * `isError`, so a card would have shown "No payload." and a failed read in green.
 * The mapper's own tests (openthrottle-agentic-utils, against a captured 1.18.16
 * stream) prove events become these chunks; this one proves what the card shows.
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

// --- The shape the opencode mapper emits for one 1.18 `tool_use` event -------

/** The call opens with its input, because opencode sends no running event. */
const toolCall = (
  callId: string,
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, tool: toolName, toolCall: input, toolName },
  };
};

/** The terminal half: its output, or its error text with `isError`. */
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
    metadata: { callId, isError, tool: toolName, toolCall: content, toolName },
  };
};

const MISSING = '/repo/does-not-exist/missing.txt';

describe('opencode tool cards (persisted replay)', () => {
  test('a parallel batch renders one card per call with its own arguments and result', () => {
    const events = replayToolEvents(
      persisted([
        toolCall('call_pwd', 'bash', { command: 'pwd' }),
        toolResult('call_pwd', 'bash', '/repo\n'),
        toolCall('call_pkg', 'read', { filePath: '/repo/package.json' }),
        toolResult('call_pkg', 'read', '{ "name": "monorepo" }'),
        toolCall('call_mcp', 'openthrottle-mcp_health', {}),
        toolResult('call_mcp', 'openthrottle-mcp_health', '{"api":"ok"}'),
      ]),
    );

    expect(events.map((event) => event.name)).toEqual([
      'bash',
      'read',
      'openthrottle-mcp_health',
    ]);
    expect(events.every((event) => event.status === 'succeeded')).toBe(true);

    for (const [callId, argument, output] of [
      ['call_pwd', 'pwd', '/repo'],
      ['call_pkg', '/repo/package.json', 'monorepo'],
      // A JSON result is pretty-printed on the card.
      ['call_mcp', 'Arguments', '"api": "ok"'],
    ]) {
      const event = events.find((candidate) => candidate.callId === callId);
      expect(event).toBeDefined();
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

  test('a failed read renders as failed with its error, beside a succeeded call', () => {
    const events = replayToolEvents(
      persisted([
        toolCall('call_pwd', 'bash', { command: 'pwd' }),
        toolResult('call_pwd', 'bash', '/repo\n'),
        toolCall('call_missing', 'read', { filePath: MISSING }),
        toolResult('call_missing', 'read', `File not found: ${MISSING}`, true),
      ]),
    );

    const pwd = events.find((event) => event.callId === 'call_pwd');
    const missing = events.find((event) => event.callId === 'call_missing');
    expect(pwd?.status).toBe('succeeded');
    expect(missing?.status).toBe('failed');
    if (missing === undefined) {
      return;
    }

    const component = render(
      <ChatToolCall defaultOpen={true} event={missing} />,
    );
    expect(component.getByRole('alert')).toHaveTextContent(
      `File not found: ${MISSING}`,
    );
    expect(component.getByText('failed')).toBeInTheDocument();
    expect(component.container.textContent).toContain(MISSING);
  });
});
