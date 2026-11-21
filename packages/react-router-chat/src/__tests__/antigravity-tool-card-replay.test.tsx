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
import { ChatTurnTimeline } from '../components/ChatTurnTimeline';
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

// --- The same probe over `agy acp` (OPENTHROTTLE_CHAT_ACP_BACKENDS) ------------

/** A failed ACP call this client refused: agy 1.5.9 sends no text of its own. */
const ACP_DENIED = 'Permission denied: the tool call was refused.';

/** The 2026-11-15 ACP probe on agy 1.5.9, as the ACP mapper now emits it. */
const ACP_PROBE_TURN = persisted([
  { delta: '', kind: 'session', metadata: { sessionId: 'agy-acp-1' } },
  toolCall('a1', 'pwd', { CommandLine: 'pwd' }),
  toolDone('a1', 'pwd', PWD_OUTPUT),
  toolCall('a2', 'File package.json', { Path: `${REPO}/package.json` }),
  toolDone('a2', 'File package.json', null),
  toolCall('a3', 'pwd', { CommandLine: 'pwd' }),
  toolError('a3', 'pwd', ACP_DENIED),
]);

describe('antigravity tool cards over ACP (persisted replay)', () => {
  test('a completed call shows its transcript, never a status wrapper', () => {
    const card = findCard(replayToolEvents(ACP_PROBE_TURN), 'a1');

    expect(card.status).toBe('succeeded');
    expect(card.resultJson).toBe(PWD_OUTPUT);
    expect(card.resultJson).not.toContain('"status"');
  });

  test('a completed read with no output says so', () => {
    const card = findCard(replayToolEvents(ACP_PROBE_TURN), 'a2');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(card.resultJson).toBeNull();
    expect(component.getByTestId('ChatToolCall-no-output')).toBeInTheDocument();
  });

  test('a refused call renders failed with the denial', () => {
    const card = findCard(replayToolEvents(ACP_PROBE_TURN), 'a3');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(component.getByText('failed')).toBeInTheDocument();
    expect(component.getByRole('alert')).toHaveTextContent(ACP_DENIED);
  });
});

// --- A permission denial ends the turn silent: the notice explains it ----------

describe('antigravity denied permissions (persisted replay)', () => {
  test('a stream-json turn with result.denied_actions renders the notice', () => {
    const turn = persisted([
      { delta: '', kind: 'session', metadata: { sessionId: 'agy-conv-2' } },
      toolCall('5', 'call_mcp_tool', { ServerName: 'x', ToolName: 'health' }),
      toolDone('5', 'call_mcp_tool', null),
      {
        delta: '',
        kind: 'usage',
        metadata: {
          deniedActions: ['McpTool'],
          model: null,
          usage: { output_tokens: 787 },
        },
      },
    ]);
    const events = foldPersistedTurnEvents(turn, '');
    const component = render(<ChatTurnTimeline events={events} />);

    expect(
      component.getByTestId('ChatDeniedActionsNotice-actions'),
    ).toHaveTextContent('McpTool.');
  });
});

// --- Calls agy cancelled after a refusal (agy 1.5.13, 2026-11-20) -------------

/** A call agy cancelled unrun after a refusal, as both mappers now emit it. */
const toolNotRun = (
  callId: string,
  toolName: string,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_result',
    metadata: {
      callId,
      isError: false,
      notRun: true,
      toolCall: null,
      toolName,
    },
  };
};

/**
 * Conv 01a1fbab over ACP (default posture): `pwd` was refused and agy
 * cancelled the cascade, so the three calls batched behind it never ran.
 */
const ACP_CANCELLED_TURN = persisted([
  { delta: '', kind: 'session', metadata: { sessionId: 'agy-acp-2' } },
  toolCall('c1', 'pwd', { CommandLine: 'pwd' }),
  toolError('c1', 'pwd', ACP_DENIED),
  toolCall('c2', 'File package.json', { Path: `${REPO}/package.json` }),
  toolNotRun('c2', 'File package.json'),
  toolCall('c3', 'Run mcp_openthrottle-mcp_health', {
    toolSummary: 'OpenThrottle health check',
  }),
  toolNotRun('c3', 'Run mcp_openthrottle-mcp_health'),
  toolCall('c4', 'File does-not-exist/missing.txt', { Path: MISSING }),
  toolNotRun('c4', 'File does-not-exist/missing.txt'),
  {
    delta: '',
    kind: 'usage',
    metadata: { deniedActions: ['pwd'], stopReason: 'end_turn' },
  },
]);

/**
 * Conv 01a1fbb0 over stream-json (Supervised): the MCP call was refused after
 * `pwd` and the `package.json` read had run; the missing-file read behind it
 * came back DONE with no output, never having run.
 */
const STREAM_CANCELLED_TURN = persisted([
  { delta: '', kind: 'session', metadata: { sessionId: 'agy-conv-3' } },
  toolCall('2', 'run_command', { CommandLine: 'pwd' }),
  toolDone('2', 'run_command', PWD_OUTPUT),
  toolCall('3', 'read_file', { Path: `${REPO}/package.json` }),
  toolDone('3', 'read_file', '377 lines, 24624 bytes'),
  toolCall('4', 'call_mcp_tool', {
    Arguments: {},
    ServerName: 'openthrottle_openthrottle-mcp',
    ToolName: 'health',
  }),
  toolError('4', 'call_mcp_tool', ACP_DENIED),
  toolCall('5', 'read_file', { Path: MISSING }),
  toolNotRun('5', 'read_file'),
]);

describe('antigravity calls cancelled after a refusal (persisted replay)', () => {
  test('ACP: the refused call fails and the cancelled ones read not run', () => {
    const events = replayToolEvents(ACP_CANCELLED_TURN);

    expect(events.map((event) => [event.callId, event.status])).toEqual([
      ['c1', 'failed'],
      ['c2', 'not_run'],
      ['c3', 'not_run'],
      ['c4', 'not_run'],
    ]);
  });

  test('ACP: a cancelled card says it was not run, not that it failed', () => {
    const card = findCard(replayToolEvents(ACP_CANCELLED_TURN), 'c4');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(card.error).toBeNull();
    expect(component.getByText('not run')).toBeInTheDocument();
    expect(component.queryByRole('alert')).not.toBeInTheDocument();
    expect(component.getByTestId('ChatToolCall-not-run')).toBeInTheDocument();
    expect(component.container.textContent).not.toContain(
      'The agent reported a failed tool call.',
    );
  });

  test('stream-json: calls that ran keep their state; the cancelled read is not run', () => {
    const events = replayToolEvents(STREAM_CANCELLED_TURN);

    expect(events.map((event) => [event.callId, event.status])).toEqual([
      ['2', 'succeeded'],
      ['3', 'succeeded'],
      ['4', 'failed'],
      ['5', 'not_run'],
    ]);
  });

  test('stream-json: the refused card says Permission denied, as on ACP', () => {
    const card = findCard(replayToolEvents(STREAM_CANCELLED_TURN), '4');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(component.getByRole('alert')).toHaveTextContent(ACP_DENIED);
    expect(component.container.textContent).not.toContain(
      'permission check failed',
    );
  });

  test('stream-json: the cancelled read no longer reads succeeded', () => {
    const card = findCard(replayToolEvents(STREAM_CANCELLED_TURN), '5');
    const component = render(<ChatToolCall defaultOpen={true} event={card} />);

    expect(component.queryByText('succeeded')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ChatToolCall-no-output'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('ChatToolCall-not-run')).toBeInTheDocument();
  });
});
