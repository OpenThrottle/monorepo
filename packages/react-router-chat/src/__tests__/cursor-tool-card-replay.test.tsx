/**
 * End-to-end guard for the cursor-agent tool cards: the chunks the cursor
 * mapper emits, folded by {@link foldPersistedTurnEvents} and rendered through
 * the real {@link ChatToolCall}, must show a rejected or errored call as
 * FAILED with its reason, and show only the tool's args and outcome.
 *
 * The fixtures are the probe turn of conversation aa2773ae (cursor-agent /
 * auto), cut down to three calls run in parallel. The mapper side — raw
 * cursor events to these chunks — is locked by cursor-agent's events.test.ts
 * in openthrottle-agentic-utils, which this browser package cannot import.
 */

import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatToolCall } from '../components/ChatToolCall';
import { foldPersistedTurnEvents } from '../turn-events';
import type { ChatTurnEvent, ChatTurnToolEvent } from '../types';

const persisted = (events: ReadonlyArray<Record<string, unknown>>): string => {
  return JSON.stringify({ events });
};

const isToolEvent = (event: ChatTurnEvent): event is ChatTurnToolEvent => {
  return event.kind === 'tool';
};

const replayToolEvents = (
  events: ReadonlyArray<Record<string, unknown>>,
): readonly ChatTurnToolEvent[] => {
  return foldPersistedTurnEvents(persisted(events), '').filter(isToolEvent);
};

const READ_PATH = '/repo/package.json';
const MISSING_PATH = '/repo/does-not-exist/missing.txt';

// --- What cursor streamed (the inner `<kind>ToolCall` records) --------------

const shellPwd = {
  args: {
    closeStdin: true,
    command: 'pwd',
    description: 'Print working directory',
    parsingResult: { executableCommands: [{ name: 'pwd' }] },
    requestId: '582a227a',
    simpleCommands: ['pwd'],
    toolCallId: 'call-0',
  },
  result: { rejected: { command: 'pwd', isReadonly: false, reason: '' } },
};
const readPackage = {
  args: { path: READ_PATH },
  result: { success: { fileSize: 17687, path: READ_PATH, totalLines: 290 } },
};
const readMissing = {
  args: { path: MISSING_PATH },
  result: { error: { errorMessage: 'File not found' } },
};

// --- The chunks the mapper emits now ----------------------------------------

const call = (
  callId: string,
  toolName: string,
  toolCall: unknown,
): Record<string, unknown> => {
  return {
    delta: '',
    kind: 'tool_call',
    metadata: { callId, toolCall, toolName },
  };
};

const result = (
  callId: string,
  toolName: string,
  toolCall: unknown,
  isError = false,
): Record<string, unknown> => {
  const metadata = isError
    ? { callId, isError, toolCall, toolName }
    : { callId, toolCall, toolName };

  return { delta: '', kind: 'tool_result', metadata };
};

/** Three calls out in parallel; results back out of order, as they were. */
const currentChunks = [
  call('call-0', 'shell', {
    command: 'pwd',
    description: 'Print working directory',
  }),
  call('call-2', 'read', readPackage.args),
  call('call-4', 'read', readMissing.args),
  result('call-2', 'read', readPackage.result.success),
  result('call-0', 'shell', 'Rejected by cursor permissions', true),
  result('call-4', 'read', 'File not found', true),
];

// --- The chunks the mapper emitted before the fix ---------------------------

/** The whole `tool_call` envelope, for both the call and its result. */
const envelope = (
  callId: string,
  key: string,
  body: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    hookAdditionalContexts: [],
    [key]: body,
    startedAtMs: '1793942882052',
    toolCallId: callId,
  };
};

const preFixChunks = [
  call(
    'call-0',
    'shell',
    envelope('call-0', 'shellToolCall', { args: shellPwd.args }),
  ),
  call(
    'call-2',
    'read',
    envelope('call-2', 'readToolCall', { args: readPackage.args }),
  ),
  call(
    'call-4',
    'read',
    envelope('call-4', 'readToolCall', { args: readMissing.args }),
  ),
  result('call-2', 'read', envelope('call-2', 'readToolCall', readPackage)),
  result('call-0', 'shell', envelope('call-0', 'shellToolCall', shellPwd)),
  result('call-4', 'read', envelope('call-4', 'readToolCall', readMissing)),
];

/** Every expectation the probe turn's cards must meet, as one check. */
const expectProbeCards = (events: readonly ChatTurnToolEvent[]): void => {
  const byId = new Map(events.map((event) => [event.callId, event]));
  const shell = byId.get('call-0');
  const read = byId.get('call-2');
  const missing = byId.get('call-4');

  expect(events).toHaveLength(3);
  expect(shell?.status).toBe('failed');
  expect(shell?.error).toBe('Rejected by cursor permissions');
  expect(missing?.status).toBe('failed');
  expect(missing?.error).toBe('File not found');
  expect(read?.status).toBe('succeeded');

  // ARGUMENTS is the tool's args; RESULT is its outcome — no envelope.
  for (const event of events) {
    expect(event.argsJson ?? '').not.toContain('toolCallId');
    expect(event.resultJson ?? '').not.toContain('startedAtMs');
  }
  expect(shell?.argsJson ?? '').not.toContain('parsingResult');
  expect(read?.resultJson ?? '').toContain('"totalLines":290');
};

describe('cursor tool cards (persisted replay)', () => {
  test('a parallel success, rejection and error each resolve to their own status', () => {
    expectProbeCards(replayToolEvents(currentChunks));
  });

  test('a rejected call renders failed with its reason', () => {
    const shell = replayToolEvents(currentChunks).find((event) => {
      return event.callId === 'call-0';
    });
    expect(shell).toBeDefined();
    if (shell === undefined) {
      return;
    }

    const component = render(<ChatToolCall defaultOpen={true} event={shell} />);

    expect(component.getByRole('alert')).toHaveTextContent(
      'Rejected by cursor permissions',
    );
    expect(component.getByText('failed')).toBeInTheDocument();
    expect(component.container).toHaveTextContent('pwd');
  });

  test('an errored call renders failed with its errorMessage', () => {
    const missing = replayToolEvents(currentChunks).find((event) => {
      return event.callId === 'call-4';
    });
    expect(missing).toBeDefined();
    if (missing === undefined) {
      return;
    }

    const component = render(
      <ChatToolCall defaultOpen={true} event={missing} />,
    );

    expect(component.getByRole('alert')).toHaveTextContent('File not found');
    expect(component.container).toHaveTextContent(MISSING_PATH);
  });

  test('the pre-fix chunks fail the same checks (every card green)', () => {
    const events = replayToolEvents(preFixChunks);

    expect(events.every((event) => event.status === 'succeeded')).toBe(true);
    expect(() => {
      expectProbeCards(events);
    }).toThrow();
  });

  test('narration between the calls replays once, between the tool blocks', () => {
    const body = [
      'Issuing all three probe calls in parallel now.',
      'Done.',
    ].join('\n\n');
    const replayed = foldPersistedTurnEvents(
      persisted([
        { delta: '', kind: 'text', metadata: { bodyOffset: 0 } },
        ...currentChunks,
        { delta: '', kind: 'text', metadata: { bodyOffset: 46 } },
      ]),
      body,
    );

    expect(replayed.map((event) => event.kind)).toEqual([
      'text',
      'tool',
      'tool',
      'tool',
      'text',
      'usage',
    ]);
    expect(replayed[0]).toMatchObject({
      text: 'Issuing all three probe calls in parallel now.',
    });
    expect(replayed[4]).toMatchObject({ text: '\n\nDone.' });
  });
});
