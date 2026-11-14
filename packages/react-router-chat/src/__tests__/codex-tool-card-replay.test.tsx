/**
 * End-to-end guard for codex tool cards: the chunks the codex mapper emits,
 * folded by {@link foldPersistedTurnEvents} and rendered through the real
 * {@link ChatToolCall}, must show each item's own Arguments and Result, keep
 * parallel items on their own cards, and render a failed command as failed.
 *
 * Before the fix (plan 971b5b35) every codex item became a lone `tool_result`
 * carrying only `{ item, itemType, toolName }`, so each card showed "No
 * payload." and the `cat` of a missing file rendered as succeeded. Those chunks
 * are still persisted for old conversations, so the legacy shape is replayed
 * here too, using the real items of conversation 479cf7c4.
 *
 * The new-shape chunks mirror what `createCodexEventMapper` emits in
 * openthrottle-agentic-utils, which this browser package cannot import; that
 * mapper's own tests prove items become these chunks (its `isError` included).
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

// --- The real items of codex conversation 479cf7c4 --------------------------

const MISSING_OUTPUT = `cat: does-not-exist/missing.txt: No such file or directory\n`;

const ITEMS = [
  {
    aggregated_output: MISSING_OUTPUT,
    command: "/bin/zsh -lc 'cat does-not-exist/missing.txt'",
    exit_code: 1,
    id: 'item_1',
    status: 'failed',
    type: 'command_execution',
  },
  {
    aggregated_output: '/repo\n',
    command: '/bin/zsh -lc pwd',
    exit_code: 0,
    id: 'item_2',
    status: 'completed',
    type: 'command_execution',
  },
  {
    aggregated_output: '{ "name": "monorepo" }\n',
    command: "/bin/zsh -lc 'cat package.json'",
    exit_code: 0,
    id: 'item_3',
    status: 'completed',
    type: 'command_execution',
  },
  {
    aggregated_output: 'da9938b\n',
    command: "/bin/zsh -lc 'git rev-parse --short HEAD'",
    exit_code: 0,
    id: 'item_4',
    status: 'completed',
    type: 'command_execution',
  },
] as const;

/** [callId, the command the card shows, a fragment of its output] */
const EXPECTED = [
  ['item_1', 'cat does-not-exist/missing.txt', 'No such file or directory'],
  ['item_2', 'pwd', '/repo'],
  ['item_3', 'cat package.json', 'monorepo'],
  ['item_4', 'git rev-parse --short HEAD', 'da9938b'],
] as const;

const MCP_CALL_ID = 'item_5';

// --- The shape the codex mapper now emits ------------------------------------

const toolCall = (
  callId: string,
  kind: string,
  args: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, itemType: kind, toolCall: args, toolName: kind },
  };
};

const toolResult = (
  callId: string,
  kind: string,
  result: unknown,
  isError: boolean,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_result',
    metadata: {
      callId,
      isError,
      itemType: kind,
      toolCall: result,
      toolName: kind,
    },
  };
};

/** Four parallel commands started together, then finished out of order. */
const CURRENT_TURN = persisted([
  ...EXPECTED.map(([callId, command]) => {
    return toolCall(callId, 'command_execution', { command });
  }),
  ...[...ITEMS].reverse().map((item) => {
    return toolResult(
      item.id,
      'command_execution',
      item.aggregated_output,
      item.status === 'failed',
    );
  }),
  toolCall(MCP_CALL_ID, 'mcp_tool_call', {
    arguments: {},
    server: 'openthrottle-mcp',
    tool: 'health',
  }),
  toolResult(MCP_CALL_ID, 'mcp_tool_call', { api: 'ok' }, false),
]);

/** What conversations saved before the fix persisted: only the raw item. */
const LEGACY_TURN = persisted(
  ITEMS.map((item) => {
    return {
      delta: '',
      kind: 'tool_result',
      metadata: { item, itemType: item.type, toolName: item.type },
    };
  }),
);

describe.each([
  { name: 'current chunks', toolMetadataJson: CURRENT_TURN },
  { name: 'legacy {item} chunks', toolMetadataJson: LEGACY_TURN },
])('codex tool cards, $name (persisted replay)', ({ toolMetadataJson }) => {
  const events = replayToolEvents(toolMetadataJson);

  test('each parallel command renders on its own card, none still running', () => {
    const commandCards = events.filter((event) => {
      return event.name === 'command_execution';
    });

    expect(commandCards.map((event) => event.callId).sort()).toEqual(
      EXPECTED.map(([callId]) => callId),
    );
    expect(events.some((event) => event.status === 'running')).toBe(false);
  });

  test('every card shows its command as Arguments and its output as Result', () => {
    for (const [callId, command, output] of EXPECTED) {
      const event = events.find((candidate) => candidate.callId === callId);
      expect(event).toBeDefined();
      if (event === undefined) {
        return;
      }

      const component = render(
        <ChatToolCall defaultOpen={true} event={event} />,
      );
      const text = component.container.textContent ?? '';
      expect(text).toContain('Arguments');
      expect(text).toContain(command);
      expect(text).toContain(output);
      expect(text).not.toContain('/bin/zsh');
      expect(text).not.toContain('No payload.');
      component.unmount();
    }
  });

  test('the missing-file read renders as failed with its error text', () => {
    const missing = events.find((event) => event.callId === 'item_1');
    expect(missing?.status).toBe('failed');
    expect(
      events
        .filter((event) => event.callId !== 'item_1')
        .every((event) => event.status === 'succeeded'),
    ).toBe(true);
    if (missing === undefined) {
      return;
    }

    const component = render(
      <ChatToolCall defaultOpen={true} event={missing} />,
    );
    expect(component.getByRole('alert')).toHaveTextContent(
      'No such file or directory',
    );
    expect(component.getByText('failed')).toBeInTheDocument();
  });
});

describe('codex mcp_tool_call card (persisted replay)', () => {
  test('shows server, tool and result', () => {
    const mcp = replayToolEvents(CURRENT_TURN).find((event) => {
      return event.callId === MCP_CALL_ID;
    });
    expect(mcp?.status).toBe('succeeded');
    if (mcp === undefined) {
      return;
    }

    const text =
      render(<ChatToolCall defaultOpen={true} event={mcp} />).container
        .textContent ?? '';
    expect(text).toContain('openthrottle-mcp');
    expect(text).toContain('health');
    expect(text).toContain('"api": "ok"');
  });
});
