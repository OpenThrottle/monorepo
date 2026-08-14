import * as React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parse } from 'graphql';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { useAgenticChatTurn } from '../use-agentic-chat-turn';
import type {
  ConversationStreamSubscriptionData,
  ConversationStreamSubscriptionVariables,
} from '../use-conversation-stream';

// A controllable stand-in for the live stream hook: the recovery tests drive
// `retryableIds` (a server retryable-timeout terminal) and `lastActivityAt` (the
// stall watchdog) directly instead of over a socket. Assigned on every render so
// the test always holds the current React setters.
let streamControl: {
  markRetryable: (id: string) => void;
} | null = null;

vi.mock('../use-conversation-stream', () => ({
  useConversationStream: (): {
    completedIds: ReadonlySet<string>;
    isStreaming: boolean;
    lastActivityAt: number | null;
    messages: never[];
    phaseByMessageId: ReadonlyMap<string, never>;
    retryableIds: ReadonlySet<string>;
  } => {
    const [retryableIds, setRetryableIds] = React.useState<ReadonlySet<string>>(
      new Set(),
    );
    streamControl = {
      markRetryable: (id: string): void =>
        setRetryableIds((previous) => new Set(previous).add(id)),
    };
    return {
      completedIds: new Set<string>(),
      isStreaming: false,
      lastActivityAt: null,
      messages: [],
      phaseByMessageId: new Map<string, never>(),
      retryableIds,
    };
  },
}));

// The stream hook is mocked, so the document is never serialized or sent; a
// syntactically-valid placeholder keeps the injected config well-typed.
const STREAM_DOCUMENT: TypedDocumentNode<
  ConversationStreamSubscriptionData,
  ConversationStreamSubscriptionVariables
> = parse(
  'subscription ConversationStreamChunkAdded($conversationId: ID!) { conversationStreamChunkAdded(conversationId: $conversationId) { delta done kind messageId sortOrder } }',
);

const RESTORED = {
  conversationId: 'conv-42',
  errorMessage: null,
  messages: [
    { body: 'Earlier question', id: 'm1', role: 'user' },
    { body: 'Earlier answer', id: 'm2', role: 'assistant' },
  ],
};

// Single harness for the whole file (react/no-multi-comp) exposing every control
// the restore/reset AND recovery tests drive.
const Harness = (): React.ReactElement => {
  const turn = useAgenticChatTurn({
    streamClient: null,
    streamDocument: STREAM_DOCUMENT,
  });
  return (
    <div>
      <span data-testid="conversation-id">{turn.conversationId ?? 'none'}</span>
      <span data-testid="can-retry">{turn.canRetry ? 'yes' : 'no'}</span>
      <span data-testid="message-count">{turn.messages.length}</span>
      <button
        onClick={() => turn.restore({ conversationId: 'conv-42' })}
        type="button"
      >
        Restore
      </button>
      <button onClick={() => turn.reset()} type="button">
        Reset
      </button>
      <button
        onClick={() =>
          turn.submitTurn('hi', {
            backend: 'openai',
            baseUrl: 'x',
            modelId: 'llama3',
            persist: 'true',
          })
        }
        type="button"
      >
        Submit
      </button>
    </div>
  );
};

const renderTurn = (): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    {
      action: () => RESTORED,
      path: '/resources/agent-conversations',
    },
  ]);

  return render(<RoutesStub />);
};

describe('useAgenticChatTurn restore/reset', () => {
  test('restore seeds the conversation id and hydrates its messages', async () => {
    const user = userEvent.setup();
    const component = renderTurn();

    expect(component.getByTestId('conversation-id')).toHaveTextContent('none');

    await user.click(component.getByRole('button', { name: 'Restore' }));

    // Id is seeded synchronously; messages hydrate once the load resolves.
    expect(component.getByTestId('conversation-id')).toHaveTextContent(
      'conv-42',
    );
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );
  });

  test('reset clears the conversation id and thread', async () => {
    const user = userEvent.setup();
    const component = renderTurn();

    await user.click(component.getByRole('button', { name: 'Restore' }));
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );

    await user.click(component.getByRole('button', { name: 'Reset' }));

    expect(component.getByTestId('conversation-id')).toHaveTextContent('none');
    expect(component.getByTestId('message-count')).toHaveTextContent('0');
  });
});

// Each `start` POST returns the next assistant id; a `cancel` POST is a no-op.
// startCalls counts only real (re)starts, so it measures how many turns ran.
let startCalls = 0;
const ASSISTANT_IDS = ['a1', 'a2', 'a3'];

const streamAction = async ({
  request,
}: {
  request: Request;
}): Promise<Record<string, unknown>> => {
  const form = await request.formData();
  if (form.get('intent') === 'cancel') {
    return { cancelled: true };
  }
  const id = ASSISTANT_IDS[startCalls] ?? 'aX';
  startCalls += 1;
  return {
    assistantMessageId: id,
    conversationId: 'conv-1',
    errorMessage: null,
    userMessageId: `u${startCalls}`,
  };
};

const renderRecovery = (): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    { action: streamAction, path: '/resources/conversation-stream' },
  ]);
  return render(<RoutesStub />);
};

// A start action that NEVER resolves: models a wedged `startConversationStream`
// so the fetcher stays in flight and no assistant id ever arrives — the exact
// window the mutation-in-flight watchdog covers. Counts only real (re)starts.
let stalledStartCalls = 0;
const hangingStreamAction = async ({
  request,
}: {
  request: Request;
}): Promise<Record<string, unknown>> => {
  const form = await request.formData();
  if (form.get('intent') === 'cancel') {
    return { cancelled: true };
  }
  stalledStartCalls += 1;
  return new Promise<Record<string, unknown>>(() => {
    // Intentionally never resolves.
  });
};

const renderStalledMutation = (): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    { action: hangingStreamAction, path: '/resources/conversation-stream' },
  ]);
  return render(<RoutesStub />);
};

describe('useAgenticChatTurn recovery', () => {
  beforeEach(() => {
    startCalls = 0;
    stalledStartCalls = 0;
    streamControl = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('auto-retries exactly once on a retryable timeout, then surfaces manual retry', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();

    await user.click(component.getByRole('button', { name: 'Submit' }));
    // 1st start → user bubble + assistant placeholder a1.
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );
    expect(startCalls).toBe(1);

    // Server publishes a retryable timeout terminal for a1 → auto-retry once.
    act(() => streamControl?.markRetryable('a1'));
    await waitFor(() => expect(startCalls).toBe(2));
    // Replay adds only the new assistant placeholder a2 — NOT a duplicate user
    // bubble (count 2 → 3, not 4).
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('3'),
    );

    // The replayed turn a2 also times out → budget spent → manual retry, no
    // third start.
    act(() => streamControl?.markRetryable('a2'));
    await waitFor(() =>
      expect(component.getByTestId('can-retry')).toHaveTextContent('yes'),
    );
    expect(startCalls).toBe(2);
  });

  test('stall watchdog trips once then surfaces manual retry without looping', async () => {
    vi.useFakeTimers();
    const component = renderRecovery();

    // fireEvent (not userEvent) is deterministic under fake timers — the repo
    // pattern for timer-driven tests (see useDebouncedSearchParam.test).
    await act(async () => {
      fireEvent.click(component.getByRole('button', { name: 'Submit' }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(startCalls).toBe(1);

    // No activity for the stall window → watchdog replays once (cancel + start).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    expect(startCalls).toBe(2);

    // The replayed turn also stalls → budget spent → manual retry, no loop.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    expect(startCalls).toBe(2);
    expect(component.getByTestId('can-retry')).toHaveTextContent('yes');
  });

  test('mutation-in-flight watchdog recovers a stalled start mutation before any chunk', async () => {
    vi.useFakeTimers();
    const component = renderStalledMutation();

    // Submit → the start mutation is in flight and never returns an assistant id
    // (no chunk, no pending turn), so the chunk-based stall watchdog can never
    // see it. Only the mutation-in-flight watchdog covers this window.
    await act(async () => {
      fireEvent.click(component.getByRole('button', { name: 'Submit' }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(stalledStartCalls).toBe(1);

    // Before the watchdog window, nothing recovers — the mutation is simply
    // still in flight (this is the pre-fix "dead composer" moment).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(44_000);
    });
    expect(stalledStartCalls).toBe(1);

    // At the mutation-in-flight window, the watchdog replays the turn once
    // instead of hanging forever. (The auto-retry budget + manual-retry
    // escalation live in `recover`, covered by the stall-watchdog test above.)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(stalledStartCalls).toBe(2);
  });
});
