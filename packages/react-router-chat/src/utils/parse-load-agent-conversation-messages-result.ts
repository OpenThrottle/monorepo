import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  ChatMessage,
  LoadAgentConversationMessagesResult,
} from '../types';
import { nullableString } from './nullable-string';

const parseChatMessage = (value: unknown): ChatMessage | null => {
  if (!isRecord(value)) {
    return null;
  }

  const message = value;

  if (
    typeof message.body !== 'string' ||
    typeof message.id !== 'string' ||
    typeof message.role !== 'string'
  ) {
    return null;
  }

  if (
    message.role !== 'assistant' &&
    message.role !== 'system' &&
    message.role !== 'user'
  ) {
    return null;
  }

  return {
    body: message.body,
    createdAt:
      typeof message.createdAt === 'string' ? message.createdAt : undefined,
    footer:
      typeof message.footer === 'string'
        ? message.footer
        : message.footer === null
          ? null
          : undefined,
    id: message.id,
    role: message.role,
  };
};

/** Parses a `load-agent-conversation-messages` action payload, or null when malformed. */
export const parseLoadAgentConversationMessagesResult = (
  data: unknown,
): LoadAgentConversationMessagesResult | null => {
  if (!isRecord(data)) {
    return null;
  }

  const d = data;

  if (!('errorMessage' in d) || !('messages' in d)) {
    return null;
  }

  const rawMessages = d.messages;

  if (!Array.isArray(rawMessages)) {
    return null;
  }

  const messages = rawMessages
    .map(parseChatMessage)
    .filter((message): message is ChatMessage => message != null);

  return {
    conversationId: nullableString(d.conversationId),
    errorMessage: nullableString(d.errorMessage),
    messages,
  };
};
