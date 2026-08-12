import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useAgenticChatTurn } from '../useAgenticChatTurn';
import type { UseAgenticChatTurnResult } from '../useAgenticChatTurn';

// No live client, so useConversationStream (used internally) takes its SSR-safe
// no-op path instead of opening a real socket. Mirrors useHeaderChatController.test.tsx.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

/** Mounts the hook inside a routes stub and exposes its latest return value. */
const renderTurn = (
  streamAction: (args: {
    request: Request;
  }) => Promise<Record<string, unknown>>,
): { captured: { current: UseAgenticChatTurnResult | null } } => {
  const captured: { current: UseAgenticChatTurnResult | null } = {
    current: null,
  };

  const Harness = () => {
    captured.current = useAgenticChatTurn();
    return null;
  };

  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    {
      action: async ({ request }: { request: Request }) =>
        streamAction({ request }),
      path: '/resources/conversation-stream',
    },
    {
      action: () => ({
        conversationId: null,
        errorMessage: null,
        messages: [],
      }),
      path: '/resources/agent-conversations',
    },
  ]);

  render(<RoutesStub />);

  return { captured };
};

describe('useAgenticChatTurn', () => {
  test('starts with an empty thread and is not streaming', () => {
    const { captured } = renderTurn(async () => ({
      assistantMessageId: null,
      conversationId: null,
      errorMessage: null,
      userMessageId: null,
    }));

    expect(captured.current?.messages).toEqual([]);
    expect(captured.current?.isStreaming).toBe(false);
    expect(captured.current?.conversationId).toBeNull();
  });

  test('submitTurn appends the user message immediately, then the pending assistant reply once the start action resolves', async () => {
    const { captured } = renderTurn(async () => ({
      assistantMessageId: 'a1',
      conversationId: 'conv-1',
      errorMessage: null,
      userMessageId: 'u1',
    }));

    act(() => {
      captured.current?.submitTurn('Hello agent', {});
    });

    await waitFor(() => {
      expect(
        captured.current?.messages.some(
          (message) => message.body === 'Hello agent',
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(captured.current?.conversationId).toBe('conv-1');
    });

    await waitFor(() => {
      expect(
        captured.current?.messages.some((message) => message.id === 'a1'),
      ).toBe(true);
    });
  });

  test('submitTurn surfaces the error message when the start action fails', async () => {
    const { captured } = renderTurn(async () => ({
      assistantMessageId: null,
      conversationId: null,
      errorMessage: 'Backend unavailable',
      userMessageId: null,
    }));

    act(() => {
      captured.current?.submitTurn('Hello agent', {});
    });

    await waitFor(() => {
      expect(captured.current?.error).toBe('Backend unavailable');
    });
  });

  test('reset clears the thread and conversation id', async () => {
    const { captured } = renderTurn(async () => ({
      assistantMessageId: 'a1',
      conversationId: 'conv-1',
      errorMessage: null,
      userMessageId: 'u1',
    }));

    act(() => {
      captured.current?.submitTurn('Hello agent', {});
    });

    await waitFor(() => {
      expect(captured.current?.conversationId).toBe('conv-1');
    });

    act(() => {
      captured.current?.reset();
    });

    await waitFor(() => {
      expect(captured.current?.conversationId).toBeNull();
      expect(captured.current?.messages).toEqual([]);
    });
  });
});
