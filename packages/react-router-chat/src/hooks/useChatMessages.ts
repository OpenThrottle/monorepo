import * as React from 'react';

import type { AppendChatMessageInput, ChatMessage } from '../types';
import { createUniqueId } from '../utils/create-unique-id';

export interface UseChatMessagesOptions {
  readonly initialMessages?: readonly ChatMessage[];
  readonly onSendMessage?: (
    message: string,
    messages: readonly ChatMessage[],
  ) => void;
}

export interface UseChatMessagesResult {
  readonly appendMessage: (message: AppendChatMessageInput) => void;
  readonly messages: readonly ChatMessage[];
  readonly sendUserMessage: (body: string) => void;
  readonly setMessages: (messages: readonly ChatMessage[]) => void;
}

/**
 * @description Uncontrolled local message list; append user/assistant rows and optionally notify on send.
 */
export const useChatMessages = (
  options: UseChatMessagesOptions = {},
): UseChatMessagesResult => {
  const { initialMessages = [], onSendMessage } = options;

  // Hooks
  const [messages, setMessages] =
    React.useState<readonly ChatMessage[]>(initialMessages);

  // Setup

  // Handlers
  const appendMessage = React.useCallback((message: AppendChatMessageInput) => {
    const next: ChatMessage = {
      body: message.body,
      createdAt: message.createdAt ?? new Date().toISOString(),
      footer: message.footer,
      id: message.id ?? createUniqueId('chat'),
      role: message.role,
    };

    setMessages((current) => [...current, next]);
  }, []);

  const sendUserMessage = React.useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) {
        return;
      }

      const next: ChatMessage = {
        body: trimmed,
        createdAt: new Date().toISOString(),
        id: createUniqueId('chat'),
        role: 'user',
      };

      setMessages((current) => {
        const updated = [...current, next];
        onSendMessage?.(trimmed, updated);
        return updated;
      });
    },
    [onSendMessage],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    appendMessage,
    messages,
    sendUserMessage,
    setMessages,
  };
};
