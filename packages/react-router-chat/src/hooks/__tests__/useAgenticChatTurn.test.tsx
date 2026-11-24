import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { RenderResult } from '@testing-library/react';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parse } from 'graphql';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type {
  ConversationStreamSubscriptionData,
  ConversationStreamSubscriptionVariables,
} from '../../conversation-stream';
import type { ChatMessage, ChatTurnEvent } from '../../types';
import { useAgenticChatTurn } from '../useAgenticChatTurn';

// A controllable stand-in for the live stream hook: the recovery tests drive
// `retryableIds` (a server retryable-timeout terminal) and `lastActivityAt` (the
// stall watchdog) directly instead of over a socket, and the Private-mode test
// streams a reply into one conversation id. Like the real hook, it only returns
// the streamed messages of the CURRENT conversation id, so a re-key drops them.
// Assigned on every render so the test always holds the current React setters.
let streamControl: {
  markCompleted: (id: string, failed?: boolean) => void;
  markRetryable: (id: string) => void;
  streamReply: (conversationId: string, message: ChatMessage) => void;
} | null = null;

vi.mock('../useConversationStream', () => ({
  useConversationStream: (options: {
    readonly conversationId: string | null;
  }): {
    completedIds: ReadonlySet<string>;
    isStreaming: boolean;
    lastActivityAt: number | null;
    messages: ChatMessage[];
    phaseByMessageId: ReadonlyMap<string, never>;
    retryableIds: ReadonlySet<string>;
  } => {
    const [retryableIds, setRetryableIds] = React.useState<ReadonlySet<string>>(
      new Set(),
    );
    const [completedIds, setCompletedIds] = React.useState<ReadonlySet<string>>(
      new Set(),
    );
    const [messages, setMessages] = React.useState<ChatMessage[]>([]);
    const [streamed, setStreamed] = React.useState<
      ReadonlyMap<string, ChatMessage[]>
    >(new Map());
    streamControl = {
      markCompleted: (id: string, failed = false): void => {
        // A failed turn ends on a usage event carrying an error.
        const usage: ChatTurnEvent = {
          error: failed ? 'boom' : null,
          kind: 'usage',
          result: null,
          sortOrder: 1,
          usageJson: null,
        };
        setMessages((previous) => [
          ...previous,
          { body: 'done', events: [usage], id, role: 'assistant' },
        ]);
        setCompletedIds((previous) => new Set(previous).add(id));
      },
      markRetryable: (id: string): void =>
        setRetryableIds((previous) => new Set(previous).add(id)),
      // Streams a finished reply: like a terminal chunk, it also completes the turn.
      streamReply: (conversationId: string, message: ChatMessage): void => {
        setStreamed((previous) =>
          new Map(previous).set(conversationId, [
            ...(previous.get(conversationId) ?? []),
            message,
          ]),
        );
        setCompletedIds((previous) => new Set(previous).add(message.id));
      },
    };
    return {
      completedIds,
      isStreaming: false,
      lastActivityAt: null,
      messages: [
        ...messages,
        ...(streamed.get(options.conversationId ?? '') ?? []),
      ],
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
      <span data-testid="queue">
        {turn.queuedMessages.map((item) => item.message).join('|')}
      </span>
      <span data-testid="queue-paused">
        {turn.isQueuePaused ? 'yes' : 'no'}
      </span>
      <button
        onClick={() =>
          turn.submitTurn('follow-up', { backend: 'openai', persist: 'true' })
        }
        type="button"
      >
        Follow up
      </button>
      <button
        onClick={() => {
          turn.submitTurn('one', { backend: 'openai' });
          turn.submitTurn('two', { backend: 'openai' });
        }}
        type="button"
      >
        Double submit
      </button>
      <button onClick={() => turn.onStop()} type="button">
        Stop
      </button>
      <button
        onClick={() => turn.sendQueuedNow(turn.queuedMessages[0]?.id ?? '')}
        type="button"
      >
        Send now
      </button>
      <button onClick={() => turn.resumeQueue()} type="button">
        Resume
      </button>
      <span data-testid="assistant-bodies">
        {turn.messages
          .filter((message) => message.role === 'assistant')
          .map((message) => message.body)
          .join('|')}
      </span>
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

// Counts POSTs to the conversation-stream action registered by renderTurn.
let turnPosts = 0;

const renderTurn = (
  pageLoader: (() => null) | undefined = undefined,
): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: Harness, loader: pageLoader, path: '/' },
    {
      action: () => RESTORED,
      path: '/resources/agent-conversations',
    },
    {
      action: () => {
        turnPosts += 1;
        return { assistantMessageId: 'a1', conversationId: 'conv-42' };
      },
      path: '/resources/conversation-stream',
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

  test('neither a restore nor a chat turn re-runs the page loader', async () => {
    let pageLoads = 0;
    const pageLoader = (): null => {
      pageLoads += 1;
      return null;
    };
    const user = userEvent.setup();
    const component = renderTurn(pageLoader);

    // The loader settles before the route element renders, so wait for the
    // element itself rather than racing it with getByRole.
    const restore = await component.findByRole('button', { name: 'Restore' });
    expect(pageLoads).toBe(1);

    await user.click(restore);
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );
    const postsBefore = turnPosts;
    await user.click(component.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(turnPosts).toBe(postsBefore + 1));
    // Give a revalidation the action would have triggered time to start.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(pageLoads).toBe(1);
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
let cancelCalls = 0;
// The `message` of each start POST, in order — which turns ran, and when.
let startedMessages: string[] = [];
const ASSISTANT_IDS = ['a1', 'a2', 'a3'];

const streamAction = async ({
  request,
}: {
  request: Request;
}): Promise<Record<string, unknown>> => {
  const form = await request.formData();
  if (form.get('intent') === 'cancel') {
    cancelCalls += 1;
    return { cancelled: true };
  }
  const id = ASSISTANT_IDS[startCalls] ?? 'aX';
  startCalls += 1;
  startedMessages.push(String(form.get('message')));
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const component = renderRecovery();

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(component.getByRole('button', { name: 'Submit' }));
    // The watchdog arms only once the start action has returned the assistant
    // id, which lands with the conversation id. Wait for it, or the 180s
    // advance can begin before the timer exists and end just short of it.
    await waitFor(() =>
      expect(component.getByTestId('conversation-id')).toHaveTextContent(
        'conv-1',
      ),
    );
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const component = renderStalledMutation();

    // Submit → the start mutation is in flight and never returns an assistant id
    // (no chunk, no pending turn), so the chunk-based stall watchdog can never
    // see it. Only the mutation-in-flight watchdog covers this window.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(component.getByRole('button', { name: 'Submit' }));
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

describe('useAgenticChatTurn queue', () => {
  beforeEach(() => {
    startCalls = 0;
    cancelCalls = 0;
    startedMessages = [];
    streamControl = null;
  });

  const startFirstTurn = async (
    component: RenderResult,
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> => {
    await user.click(component.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(startCalls).toBe(1));
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );
  };

  test('queues a message sent mid-turn and sends it when the turn succeeds', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();
    await startFirstTurn(component, user);

    await user.click(component.getByRole('button', { name: 'Follow up' }));
    expect(component.getByTestId('queue')).toHaveTextContent('follow-up');
    expect(startCalls).toBe(1);

    act(() => streamControl?.markCompleted('a1'));

    await waitFor(() => expect(startCalls).toBe(2));
    expect(startedMessages).toEqual(['hi', 'follow-up']);
    expect(component.getByTestId('queue')).toHaveTextContent('');
  });

  test('pauses instead of sending when the turn fails', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();
    await startFirstTurn(component, user);
    await user.click(component.getByRole('button', { name: 'Follow up' }));

    act(() => streamControl?.markCompleted('a1', true));

    await waitFor(() =>
      expect(component.getByTestId('queue-paused')).toHaveTextContent('yes'),
    );
    expect(startCalls).toBe(1);
    expect(component.getByTestId('queue')).toHaveTextContent('follow-up');

    await user.click(component.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(startCalls).toBe(2));
    expect(startedMessages).toEqual(['hi', 'follow-up']);
  });

  test('Stop pauses the queue and sends nothing', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();
    await startFirstTurn(component, user);
    await user.click(component.getByRole('button', { name: 'Follow up' }));

    await user.click(component.getByRole('button', { name: 'Stop' }));

    await waitFor(() => expect(cancelCalls).toBe(1));
    expect(component.getByTestId('queue-paused')).toHaveTextContent('yes');
    // Let any drain the cancel settling might trigger run.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(startCalls).toBe(1);
  });

  test('Send now cancels the running turn, then starts the queued message', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();
    await startFirstTurn(component, user);
    await user.click(component.getByRole('button', { name: 'Follow up' }));

    await user.click(component.getByRole('button', { name: 'Send now' }));

    await waitFor(() => expect(startCalls).toBe(2));
    expect(cancelCalls).toBe(1);
    expect(startedMessages).toEqual(['hi', 'follow-up']);
    expect(component.getByTestId('queue')).toHaveTextContent('');
    expect(component.getByTestId('queue-paused')).toHaveTextContent('no');
  });

  test('a second submit in the same tick queues instead of starting a parallel turn', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();

    await user.click(component.getByRole('button', { name: 'Double submit' }));

    await waitFor(() => {
      expect(component.getByTestId('message-count')).toHaveTextContent('2');
    });
    // Past the start result: the queued message still waits for the turn.
    expect(startedMessages).toEqual(['one']);
    expect(component.getByTestId('queue')).toHaveTextContent('two');
    expect(component.getByTestId('queue')).toHaveTextContent('two');
  });

  test('reset drops queued messages', async () => {
    const user = userEvent.setup();
    const component = renderRecovery();
    await startFirstTurn(component, user);
    await user.click(component.getByRole('button', { name: 'Follow up' }));

    await user.click(component.getByRole('button', { name: 'Reset' }));

    expect(component.getByTestId('queue')).toHaveTextContent('');
  });
});

// Private mode: every start mints a fresh synthetic conversation id, exactly as
// the server's `startConversationStream` does for `persist=false`.
let privateStarts = 0;
const privateStreamAction = (): Record<string, unknown> => {
  privateStarts += 1;
  return {
    assistantMessageId: `p${privateStarts}`,
    conversationId: `private-${privateStarts}`,
    errorMessage: null,
    userMessageId: null,
  };
};

const renderPrivate = (): RenderResult => {
  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    { action: privateStreamAction, path: '/resources/conversation-stream' },
  ]);
  return render(<RoutesStub />);
};

describe('useAgenticChatTurn Private mode', () => {
  beforeEach(() => {
    privateStarts = 0;
    streamControl = null;
  });

  test('keeps an earlier reply when the next turn re-keys to a new conversation id', async () => {
    const user = userEvent.setup();
    const component = renderPrivate();

    await user.click(component.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(component.getByTestId('conversation-id')).toHaveTextContent(
        'private-1',
      ),
    );
    act(() =>
      streamControl?.streamReply('private-1', {
        body: 'Cherry',
        id: 'p1',
        role: 'assistant',
      }),
    );
    await waitFor(() =>
      expect(component.getByTestId('assistant-bodies')).toHaveTextContent(
        'Cherry',
      ),
    );

    await user.click(component.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(component.getByTestId('conversation-id')).toHaveTextContent(
        'private-2',
      ),
    );
    act(() =>
      streamControl?.streamReply('private-2', {
        body: 'Grape',
        id: 'p2',
        role: 'assistant',
      }),
    );

    await waitFor(() =>
      expect(component.getByTestId('assistant-bodies')).toHaveTextContent(
        'Cherry|Grape',
      ),
    );
  });
});
