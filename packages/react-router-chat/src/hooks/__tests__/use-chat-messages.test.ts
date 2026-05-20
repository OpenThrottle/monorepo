import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useChatMessages } from '../use-chat-messages';

describe('useChatMessages', () => {
  test('should start with empty messages by default', () => {
    const { result } = renderHook(() => useChatMessages());
    expect(result.current.messages).toEqual([]);
  });

  test('should use initialMessages when provided', () => {
    const initial = [{ body: 'Hi', id: '1', role: 'user' as const }];
    const { result } = renderHook(() =>
      useChatMessages({ initialMessages: initial }),
    );
    expect(result.current.messages).toEqual(initial);
  });

  describe('when sendUserMessage is called', () => {
    test('should append a user message with trimmed body', () => {
      const { result } = renderHook(() => useChatMessages());
      act(() => {
        result.current.sendUserMessage('  Hello  ');
      });
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]?.role).toBe('user');
      expect(result.current.messages[0]?.body).toBe('Hello');
      expect(result.current.messages[0]?.id).toBeTruthy();
    });

    test('should not append for whitespace-only input', () => {
      const { result } = renderHook(() => useChatMessages());
      act(() => {
        result.current.sendUserMessage('   ');
      });
      expect(result.current.messages).toHaveLength(0);
    });

    test('should invoke onSendMessage with trimmed text and updated list', () => {
      const onSendMessage = vi.fn();
      const { result } = renderHook(() => useChatMessages({ onSendMessage }));
      act(() => {
        result.current.sendUserMessage('Question');
      });
      expect(onSendMessage).toHaveBeenCalledTimes(1);
      expect(onSendMessage).toHaveBeenCalledWith('Question', [
        expect.objectContaining({ body: 'Question', role: 'user' }),
      ]);
    });
  });

  describe('when appendMessage is called', () => {
    test('should append assistant messages with generated id', () => {
      const { result } = renderHook(() => useChatMessages());
      act(() => {
        result.current.appendMessage({
          body: 'Reply',
          role: 'assistant',
        });
      });
      expect(result.current.messages[0]?.body).toBe('Reply');
      expect(result.current.messages[0]?.role).toBe('assistant');
    });

    test('should preserve optional footer on appended messages', () => {
      const { result } = renderHook(() => useChatMessages());
      act(() => {
        result.current.appendMessage({
          body: 'Reply',
          footer: 'Tool: health',
          role: 'assistant',
        });
      });
      expect(result.current.messages[0]?.footer).toBe('Tool: health');
    });
  });

  describe('when setMessages is called', () => {
    test('should replace the thread', () => {
      const { result } = renderHook(() => useChatMessages());
      const replacement = [
        { body: 'Reset', id: 'r1', role: 'system' as const },
      ];
      act(() => {
        result.current.setMessages(replacement);
      });
      expect(result.current.messages).toEqual(replacement);
    });
  });
});
