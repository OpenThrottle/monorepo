/**
 * End-to-end guard for antigravity (agy) tool cards: the chunks the antigravity
 * mapper emits for agy 1.5.9's terminal tool steps, folded by
 * {@link foldPersistedTurnEvents} and rendered through the real
 * {@link ChatToolCall}, must show a failed step as failed with its own message,
 * and a result pane that holds the tool's output — never its arguments.
 *
 * Before the fix the mapper sent `{ error, output, status }` with no `isError`,
 * so an ERROR step rendered green, and `output` fell back to the arguments when
 * agy reported none, so every Result pane repeated the call's own input. The
 * mapper's own tests (openthrottle-agentic-utils) prove agy's events become
 * these chunks; this one proves what the card shows.
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

const findCard = (
  events: readonly ChatTurnToolEvent[],
  callId: string,
): ChatTurnToolEvent => {
  const event = events.find((candidate) => candidate.callId === callId);
  if (event === undefined) {
    throw new Error(`no tool card for call ${callId}`);
  }

  return event;
};

// --- The shape the antigravity mapper emits for one agy tool step -------------

/** The ACTIVE step opens the card with the tool's own (unwrapped) arguments. */
const toolCall = (
  callId: string,
  toolName: string,
  args: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, toolCall: args, toolName },
  };
};

/** A DONE step: its output alone, or `null` when agy reported none. */
const toolDone = (
  callId: string,
  toolName: string,
  output: string | null,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_result',
    metadata: { callId, isError: false, toolCall: output, toolName },
  };
};

/** An ERROR step: `isError` plus `tool_info.error.message`. */
const toolError = (
  callId: string,
  toolName: string,
  message: string,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_result',
    metadata: { callId, isError: true, toolCall: message, toolName },
  };
};

const REPO = '/repo';
const MISSING = `${REPO}/does-not-exist/missing.txt`;
const PWD_OUTPUT = `Command exited with code 0.\n\nCommand output:\n${REPO}\r\n`;
const DENIED = `permission check failed for mcp "openthrottle_openthrottle-mcp/health": user denied permission`;

/** The 2026-11-14 parallel probe on agy 1.5.9, as the mapper now emits it. */
const PROBE_TURN = persisted([
  { delta: '', kind: 'session', metadata: { sessionId: 'agy-conv-1' } },
  toolCall('2', 'run_command', { CommandLine: 'pwd' }),
  toolCall('4', 'read_file', { Path: `${REPO}/package.json` }),
  toolCall('5', 'call_mcp_tool', {
    Arguments: {},
    ServerName: 'openthrottle_openthrottle-mcp',
    ToolName: 'health',
  }),
  toolCall('6', 'read_file', { Path: MISSING }),
  toolDone('2', 'run_command', PWD_OUTPUT),
  toolDone('4', 'read_file', '354 lines, 22251 bytes'),
  toolError('5', 'call_mcp_tool', DENIED),
  toolDone('6', 'read_file', null),
]);

describe('antigravity tool cards (persisted replay)', () => {
  test('a parallel batch resolves each card by its own step, DONE and ERROR alike', () => {
    const events = replayToolEvents(PROBE_TURN);

    expect(events.map((event) => [event.callId, event.status])).toEqual([
      ['2', 'succeeded'],
      ['4', 'succeeded'],
      ['5', 'failed'],
      ['6', 'succeeded'],
    ]);
  });

  test('an ERROR step renders failed with its own message', () => {
    const card = findCard(replayToolEvents(PROBE_TURN), '5');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(component.getByText('failed')).toBeInTheDocument();
    expect(component.getByRole('alert')).toHaveTextContent(DENIED);
    expect(component.queryByText('Result')).not.toBeInTheDocument();
  });

  test('a DONE step shows its real output as the result, not its arguments', () => {
    const card = findCard(replayToolEvents(PROBE_TURN), '2');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(card.resultJson).toBe(PWD_OUTPUT);
    expect(card.resultJson).not.toContain('CommandLine');
    expect(component.getByText('Result')).toBeInTheDocument();
    expect(component.container.textContent).toContain('Command output:');
  });

  test('a DONE step with no output says so instead of echoing the arguments', () => {
    const card = findCard(replayToolEvents(PROBE_TURN), '6');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(card.resultJson).toBeNull();
    expect(component.getByText('Arguments')).toBeInTheDocument();
    expect(component.queryByText('Result')).not.toBeInTheDocument();
    expect(component.getByTestId('ChatToolCall-no-output')).toBeInTheDocument();
  });
});
