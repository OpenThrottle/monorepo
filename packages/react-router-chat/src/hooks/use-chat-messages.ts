import * as React from 'react';
import type { ChatMessage, ChatMessageRole } from '../types';

export interface UseChatMessagesOptions {
  readonly initialMessages?: readonly ChatMessage[];
  readonly onSendMessage?: (
    message: string,
    messages: readonly ChatMessage[],
  ) => void;
}

export interface AppendChatMessageInput {
  readonly body: string;
  readonly createdAt?: string;
  readonly id?: string;
  readonly role: ChatMessageRole;
}

export interface UseChatMessagesResult {
  readonly appendMessage: (message: AppendChatMessageInput) => void;
  readonly messages: readonly ChatMessage[];
  readonly sendUserMessage: (body: string) => void;
  readonly setMessages: (messages: readonly ChatMessage[]) => void;
}

const createMessageId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * @description Uncontrolled local message list; append user/assistant rows and optionally notify on send.
 */
export const useChatMessages = (
  options: UseChatMessagesOptions = {},
): UseChatMessagesResult => {
  const { initialMessages = [], onSendMessage } = options;

  const [messages, setMessages] =
    React.useState<readonly ChatMessage[]>(initialMessages);

  const appendMessage = React.useCallback((message: AppendChatMessageInput) => {
    const next: ChatMessage = {
      body: message.body,
      createdAt: message.createdAt ?? new Date().toISOString(),
      id: message.id ?? createMessageId(),
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
        id: createMessageId(),
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

  return {
    appendMessage,
    messages,
    sendUserMessage,
    setMessages,
  };
};
