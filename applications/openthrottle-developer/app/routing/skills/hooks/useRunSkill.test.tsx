import { act, renderHook } from '@testing-library/react';
import type { ChatMessage } from '@openthrottle/react-router-chat';
import { toast } from '@openthrottle/react-router-shadcn';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RunSkillPayload } from '~/routing/skills/components/RunSkillDialog';
import { useRunSkill } from './useRunSkill';

vi.mock('@openthrottle/react-router-shadcn', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const errorMock = vi.mocked(toast.error);

// Mutable stand-in for the turn returned by useAgenticChatTurn: useRunSkill only
// depends on this shape (submitTurn/isStreaming/messages/error/onStop), so
// controlling it directly is simpler than driving a real conversation stream.
const turnState: {
  error: string | null;
  isStreaming: boolean;
  messages: ChatMessage[];
  onStop: ReturnType<typeof vi.fn>;
  submitTurn: ReturnType<typeof vi.fn>;
} = {
  error: null,
  isStreaming: false,
  messages: [],
  onStop: vi.fn(),
  submitTurn: vi.fn(),
};

vi.mock('~/routing/home/hooks/useAgenticChatTurn', () => ({
  useAgenticChatTurn: () => turnState,
}));

const payload = (fields: Record<string, string>): RunSkillPayload => ({
  fields,
  message: '/deploy staging',
});

describe('useRunSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    turnState.error = null;
    turnState.isStreaming = false;
    turnState.messages = [];
  });

  test('starts closed and not streaming', () => {
    const { result } = renderHook(() => useRunSkill());

    expect(result.current.conversationOpen).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  test('onRun submits the payload and opens the conversation', () => {
    const { result } = renderHook(() => useRunSkill());

    act(() =>
      result.current.onRun(payload({ backend: 'claude', modelId: 'sonnet' })),
    );

    expect(turnState.submitTurn).toHaveBeenCalledWith('/deploy staging', {
      backend: 'claude',
      modelId: 'sonnet',
    });
    expect(result.current.conversationOpen).toBe(true);
  });

  test('onSendFollowUp reuses the last run fields and trims the message', () => {
    const { result } = renderHook(() => useRunSkill());

    act(() =>
      result.current.onRun(payload({ backend: 'claude', modelId: 'sonnet' })),
    );
    turnState.submitTurn.mockClear();

    act(() => result.current.onSendFollowUp('  do it again  '));

    expect(turnState.submitTurn).toHaveBeenCalledWith('do it again', {
      backend: 'claude',
      modelId: 'sonnet',
    });
  });

  test('onSendFollowUp ignores a blank message', () => {
    const { result } = renderHook(() => useRunSkill());

    act(() => result.current.onSendFollowUp('   '));

    expect(turnState.submitTurn).not.toHaveBeenCalled();
  });

  test('onConversationOpenChange toggles the sheet state', () => {
    const { result } = renderHook(() => useRunSkill());

    act(() => result.current.onConversationOpenChange(true));
    expect(result.current.conversationOpen).toBe(true);

    act(() => result.current.onConversationOpenChange(false));
    expect(result.current.conversationOpen).toBe(false);
  });

  test('onStop delegates to the turn', () => {
    const { result } = renderHook(() => useRunSkill());

    act(() => result.current.onStop());

    expect(turnState.onStop).toHaveBeenCalledTimes(1);
  });

  test('surfaces a turn error as a toast exactly once per distinct message', () => {
    const { rerender } = renderHook(() => useRunSkill());

    turnState.error = 'connection reset';
    rerender();
    expect(errorMock).toHaveBeenCalledTimes(1);

    // Same error again: no repeat toast.
    rerender();
    expect(errorMock).toHaveBeenCalledTimes(1);

    // A new error message fires again.
    turnState.error = 'timed out';
    rerender();
    expect(errorMock).toHaveBeenCalledTimes(2);
  });

  test('never toasts an empty/blank error (phantom-toast guard)', () => {
    const { rerender } = renderHook(() => useRunSkill());

    turnState.error = '   ';
    rerender();

    expect(errorMock).not.toHaveBeenCalled();
  });
});
