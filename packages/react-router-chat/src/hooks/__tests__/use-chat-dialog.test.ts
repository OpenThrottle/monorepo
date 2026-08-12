import type { PropsWithChildren, ReactElement } from 'react';
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useChatDialog } from '../use-chat-dialog';
import { ChatProvider } from '../../context/chat-context';
import type { ChatProviderProps } from '../../context/chat-context';
import type { ChatMessage } from '../../types';

const messages: readonly ChatMessage[] = [
  { body: 'Hi', id: '1', role: 'user' },
];

const makeWrapper =
  (providerProps: Omit<ChatProviderProps, 'children'>) =>
  ({ children }: PropsWithChildren): ReactElement =>
    React.createElement(ChatProvider, providerProps, children);

describe('useChatDialog', () => {
  test('throws when neither props nor a provider supply messages/onSendMessage', () => {
    expect(() => renderHook(() => useChatDialog({}))).toThrow(
      'ChatDialog requires messages and onSendMessage props, or a ChatProvider ancestor.',
    );
  });

  test('resolves directly from props when no provider is present', () => {
    const onSendMessage = vi.fn();
    const { result } = renderHook(() =>
      useChatDialog({ messages, onSendMessage }),
    );
    expect(result.current.messages).toBe(messages);
    expect(result.current.onSendMessage).toBe(onSendMessage);
    expect(result.current.composer).toBeUndefined();
    expect(result.current.composerDisabled).toBe(false);
    expect(result.current.onStartNewChat).toBeUndefined();
  });

  test('falls back to the provider when props are absent', () => {
    const onSendMessage = vi.fn();
    const onStartNewChat = vi.fn();
    const wrapper = makeWrapper({
      composerDisabled: true,
      messages,
      onSendMessage,
      onStartNewChat,
    });
    const { result } = renderHook(() => useChatDialog({}), { wrapper });
    expect(result.current.messages).toBe(messages);
    expect(result.current.onSendMessage).toBe(onSendMessage);
    expect(result.current.onStartNewChat).toBe(onStartNewChat);
    expect(result.current.composerDisabled).toBe(true);
  });

  test('a prop overrides the provider value for the same field', () => {
    const providerSend = vi.fn();
    const propSend = vi.fn();
    const propMessages: readonly ChatMessage[] = [
      { body: 'Override', id: '2', role: 'user' },
    ];
    const wrapper = makeWrapper({ messages, onSendMessage: providerSend });
    const { result } = renderHook(
      () => useChatDialog({ messages: propMessages, onSendMessage: propSend }),
      { wrapper },
    );
    expect(result.current.messages).toBe(propMessages);
    expect(result.current.onSendMessage).toBe(propSend);
  });

  test('defaults composerDisabled to false when no prop or provider value is set', () => {
    const { result } = renderHook(() =>
      useChatDialog({ messages, onSendMessage: vi.fn() }),
    );
    expect(result.current.composerDisabled).toBe(false);
  });
});
