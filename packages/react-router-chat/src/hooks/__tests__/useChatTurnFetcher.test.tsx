// import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ChatTurnResult } from '../../types';
import {
  SEND_AGENT_MESSAGE_INTENT,
  useChatTurnFetcher,
} from '../useChatTurnFetcher';

const mockSubmit = vi.fn();

let fetcherState: 'idle' | 'loading' | 'submitting' = 'idle';
let fetcherData: ChatTurnResult | undefined;

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

vi.mock('react-router', () => ({
  useFetcher: () => ({
    data: fetcherData,
    state: fetcherState,
    submit: mockSubmit,
  }),
}));

describe('useChatTurnFetcher', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    fetcherState = 'idle';
    fetcherData = undefined;
    sessionStorage.clear();
  });

  test('should optimistically append user message and POST to root action', () => {
    const { result } = renderHook(() => useChatTurnFetcher({ action: '/' }));

    act(() => {
      result.current.sendUserMessage('What plans are pending?');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.role).toBe('user');
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: SEND_AGENT_MESSAGE_INTENT,
        message: 'What plans are pending?',
      }),
      { action: '/', method: 'post' },
    );
    expect(mockSubmit.mock.calls[0]?.[0]?.conversationId).toBeTruthy();
  });

  test('should disable composer while fetcher is loading', () => {
    fetcherState = 'loading';
    const { result } = renderHook(() => useChatTurnFetcher({}));

    expect(result.current.composerDisabled).toBe(true);
    expect(result.current.isSubmitting).toBe(true);
  });

  test('should append assistant reply when fetcher returns idle with turn data', async () => {
    const { result, rerender } = renderHook(() => useChatTurnFetcher({}));

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    fetcherState = 'submitting';
    rerender();

    fetcherData = sampleTurn({
      assistantText: 'Hi there',
    });
    fetcherState = 'idle';
    rerender();

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[1]?.role).toBe('assistant');
    expect(result.current.messages[1]?.body).toBe('Hi there');
    expect(result.current.lastTurn).toEqual(fetcherData);
    expect(result.current.errorMessage).toBeNull();
  });

  test('should surface server errorMessage as system message', async () => {
    const { result, rerender } = renderHook(() => useChatTurnFetcher({}));

    act(() => {
      result.current.sendUserMessage('Hello');
    });

    fetcherState = 'submitting';
    rerender();

    fetcherData = sampleTurn({
      assistantText: null,
      errorMessage: 'Agent unavailable',
    });
    fetcherState = 'idle';
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

    fetcherState = 'submitting';
    rerender();

    fetcherData = sampleTurn({
      assistantText: 'Reply',
      mcpTool: 'health',
      routingConfidence: 0.4,
      routingReason: 'exact_health_ping',
    });
    fetcherState = 'idle';
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
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'stored-conv-id' }),
      expect.any(Object),
    );
  });
});
