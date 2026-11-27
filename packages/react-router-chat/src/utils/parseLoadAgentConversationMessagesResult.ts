import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  ChatActiveTurn,
  ChatMessage,
  ChatMessageAttachment,
  LoadAgentConversationMessagesResult,
} from '../types';
import { nullableString } from './nullableString';

const parseFooter = (value: unknown): string | null | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null) {
    return null;
  }

  return undefined;
};

const parseAttachment = (value: unknown): ChatMessageAttachment | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  return {
    byteSize: typeof value.byteSize === 'number' ? value.byteSize : null,
    height: typeof value.height === 'number' ? value.height : null,
    id: value.id,
    mimeType: nullableString(value.mimeType),
    originalName: nullableString(value.originalName),
    width: typeof value.width === 'number' ? value.width : null,
  };
};

const parseAttachments = (value: unknown): ChatMessageAttachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(parseAttachment)
    .filter((attachment): attachment is ChatMessageAttachment => {
      return attachment !== null;
    });
};

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

  const attachments = parseAttachments(message.attachments);

  return {
    ...(attachments.length > 0 ? { attachments } : {}),
    body: message.body,
    createdAt:
      typeof message.createdAt === 'string' ? message.createdAt : undefined,
    footer: parseFooter(message.footer),
    id: message.id,
    role: message.role,
  };
};

const parseActiveTurn = (value: unknown): ChatActiveTurn | null => {
  if (
    !isRecord(value) ||
    typeof value.assistantMessageId !== 'string' ||
    typeof value.startedAt !== 'string'
  ) {
    return null;
  }

  return {
    assistantMessageId: value.assistantMessageId,
    startedAt: value.startedAt,
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
    activeTurn: parseActiveTurn(d.activeTurn),
    conversationId: nullableString(d.conversationId),
    errorMessage: nullableString(d.errorMessage),
    firstMessageIndex:
      typeof d.firstMessageIndex === 'number' ? d.firstMessageIndex : 0,
    messages,
  };
};
