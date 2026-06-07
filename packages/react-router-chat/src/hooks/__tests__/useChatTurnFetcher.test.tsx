// import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  ChatTurnResult,
  LoadAgentConversationMessagesResult,
} from '../../types';
import {
  LOAD_AGENT_CONVERSATION_MESSAGES_INTENT,
  SEND_AGENT_MESSAGE_INTENT,
  useChatTurnFetcher,
} from '../useChatTurnFetcher';

const mockTurnSubmit = vi.fn();
const mockHistorySubmit = vi.fn();

let turnFetcherState: 'idle' | 'loading' | 'submitting' = 'idle';
let turnFetcherData: ChatTurnResult | undefined;
let historyFetcherState: 'idle' | 'loading' | 'submitting' = 'idle';
let historyFetcherData: LoadAgentConversationMessagesResult | undefined;

const sampleTurn = (
  overrides: Partial<ChatTurnResult> = {},
): ChatTurnResult => ({
  assistantText: null,
  conversationId: null,
  errorMessage: null,
  mcpTool: null,
  readOnlyAgentsChat: true,
  routingConfidence: null,
  routingReason: null,
  structuredPayloadJson: null,
  toolMetadataJson: null,
  ...overrides,
});

vi.mock('react-router', () => {
  let fetcherIndex = 0;

  return {
    useFetcher: () => {
      fetcherIndex += 1;
      const isHistoryFetcher = fetcherIndex % 2 === 0;

      if (isHistoryFetcher) {
        return {
          data: historyFetcherData,
          state: historyFetcherState,
          submit: mockHistorySubmit,
        };
      }

      return {
        data: turnFetcherData,
        state: turnFetcherState,
        submit: mockTurnSubmit,
      };
    },
  };
});

describe('useChatTurnFetcher', () => {
  beforeEach(() => {
    mockTurnSubmit.mockReset();
    mockHistorySubmit.mockReset();
    turnFetcherState = 'idle';
    turnFetcherData = undefined;
    historyFetcherState = 'idle';
    historyFetcherData = undefined;
    sessionStorage.clear();
  });

  test('should optimistically append user message and POST to root action', () => {
    const { result } = renderHook(() => useChatTurnFetcher({ action: '/' }));

    act(() => {
      result.current.sendUserMessage('What plans are pending?');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.role).toBe('user');
    expect(mockTurnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: SEND_AGENT_MESSAGE_INTENT,
        message: 'What plans are pending?',
      }),
      { action: '/', method: 'post' },
    );
    expect(mockTurnSubmit.mock.calls[0]?.[0]?.conversationId).toBeTruthy();
  });

  test('should disable composer while fetcher is loading', () => {
    turnFetcherState = 'loading';
    const { result } = renderHook(() => useChatTurnFetcher({}));

    expect(result.current.composerDisabled).toBe(true);
    expect(result.current.isSubmitting).toBe(true);
  });

  test('should append assistant reply when fetcher returns idle with turn data', async () => {
    const { result, rerender } = renderHook(() => useChatTurnFetcher({}));

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    turnFetcherState = 'submitting';
    rerender();

    turnFetcherData = sampleTurn({
      assistantText: 'Hi there',
    });
    turnFetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[1]?.role).toBe('assistant');
    expect(result.current.messages[1]?.body).toBe('Hi there');
    expect(result.current.lastTurn).toEqual(turnFetcherData);
    expect(result.current.errorMessage).toBeNull();
  });

  test('should surface server errorMessage as system message', async () => {
    const { result, rerender } = renderHook(() => useChatTurnFetcher({}));

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    turnFetcherState = 'submitting';
    rerender();

    turnFetcherData = sampleTurn({
      assistantText: null,
      errorMessage: 'Agent unavailable',
    });
    turnFetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('Agent unavailable');
    });

    expect(result.current.messages[1]?.role).toBe('system');
    expect(result.current.messages[1]?.body).toBe('Agent unavailable');
  });

  test('should append assistant footer when routing metadata is present', async () => {
    const { result, rerender } = renderHook(() => useChatTurnFetcher({}));

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    turnFetcherState = 'submitting';
    rerender();

    turnFetcherData = sampleTurn({
      assistantText: 'Reply',
      mcpTool: 'health',
      routingConfidence: 0.4,
      routingReason: 'exact_health_ping',
    });
    turnFetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[1]?.footer).toContain(
      'Low-confidence route',
    );
  });

  test('should reuse conversationId from sessionStorage', () => {
    sessionStorage.setItem(
      'openthrottle.chat.conversationId',
      'stored-conv-id',
    );

    const { result } = renderHook(() => useChatTurnFetcher({}));

    act(() => {
      result.current.sendUserMessage('Follow up');
    });

    expect(result.current.conversationId).toBe('stored-conv-id');
    expect(mockTurnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'stored-conv-id' }),
      expect.any(Object),
    );
  });

  test('should POST persist=true and avoid client-minted conversation ids when persist is enabled', () => {
    const { result } = renderHook(() => useChatTurnFetcher({ persist: true }));

    act(() => {
      result.current.sendUserMessage('Persist this turn');
    });

    expect(result.current.conversationId).toBeNull();
    expect(mockTurnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Persist this turn',
        persist: 'true',
      }),
      expect.any(Object),
    );
    expect(mockTurnSubmit.mock.calls[0]?.[0]?.conversationId).toBeUndefined();
  });

  test('should store server conversationId after a persisted turn', async () => {
    const { result, rerender } = renderHook(() =>
      useChatTurnFetcher({ persist: true }),
    );

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    turnFetcherState = 'submitting';
    rerender();

    turnFetcherData = sampleTurn({
      assistantText: 'Saved',
      conversationId: 'server-conv-id',
    });
    turnFetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.conversationId).toBe('server-conv-id');
    });

    expect(sessionStorage.getItem('openthrottle.chat.conversationId')).toBe(
      'server-conv-id',
    );
  });

  test('should load stored conversation history on mount when persist is enabled', () => {
    sessionStorage.setItem(
      'openthrottle.chat.conversationId',
      'stored-server-id',
    );

    renderHook(() => useChatTurnFetcher({ persist: true }));

    expect(mockHistorySubmit).toHaveBeenCalledWith(
      {
        conversationId: 'stored-server-id',
        intent: LOAD_AGENT_CONVERSATION_MESSAGES_INTENT,
      },
      { action: '/', method: 'post' },
    );
  });

  test('should hydrate messages from history fetcher response', async () => {
    sessionStorage.setItem(
      'openthrottle.chat.conversationId',
      'stored-server-id',
    );

    const { result, rerender } = renderHook(() =>
      useChatTurnFetcher({ persist: true }),
    );

    historyFetcherData = {
      conversationId: 'stored-server-id',
      errorMessage: null,
      messages: [
        {
          body: 'Earlier question',
          createdAt: '2026-06-07T00:00:00.000Z',
          id: 'msg-user',
          role: 'user',
        },
        {
          body: 'Earlier answer',
          createdAt: '2026-06-07T00:00:01.000Z',
          id: 'msg-assistant',
          role: 'assistant',
        },
      ],
    };
    historyFetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0]?.body).toBe('Earlier question');
    expect(result.current.messages[1]?.body).toBe('Earlier answer');
  });

  test('should clear thread state and sessionStorage when startNewChat is called', async () => {
    const { result, rerender } = renderHook(() =>
      useChatTurnFetcher({ persist: true }),
    );

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    turnFetcherState = 'submitting';
    rerender();

    turnFetcherData = sampleTurn({
      assistantText: 'Saved',
      conversationId: 'server-conv-id',
      errorMessage: null,
    });
    turnFetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.conversationId).toBe('server-conv-id');
    });

    act(() => {
      result.current.startNewChat();
    });

    expect(result.current.conversationId).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.lastTurn).toBeNull();
    expect(
      sessionStorage.getItem('openthrottle.chat.conversationId'),
    ).toBeNull();
  });

  test('should mint a new server conversation on next send after startNewChat', async () => {
    sessionStorage.setItem('openthrottle.chat.conversationId', 'old-server-id');

    const { result } = renderHook(() => useChatTurnFetcher({ persist: true }));

    act(() => {
      result.current.startNewChat();
    });

    act(() => {
      result.current.sendUserMessage('Fresh thread');
    });

    expect(mockTurnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fresh thread',
        persist: 'true',
      }),
      expect.any(Object),
    );
    expect(
      mockTurnSubmit.mock.calls.at(-1)?.[0]?.conversationId,
    ).toBeUndefined();
  });
});
