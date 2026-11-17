import type { ChatMessage } from '../types';

/**
 * Overlay a streamed assistant turn onto its ordered placeholder by message id,
 * carrying the flat body (fallback) and, when present, the `events` timeline.
 */
export const overlayStreamedMessage = (
  message: ChatMessage,
  streamed: ChatMessage | undefined,
): ChatMessage => {
  if (streamed === undefined) {
    return message;
  }

  if (streamed.events !== undefined) {
    return { ...message, body: streamed.body, events: streamed.events };
  }

  return { ...message, body: streamed.body };
};

/** Append an empty assistant placeholder unless one with `id` already exists. */
export const appendAssistantPlaceholder = (
  messages: ChatMessage[],
  id: string,
): ChatMessage[] => {
  if (messages.some((message) => message.id === id)) {
    return messages;
  }

  return [...messages, { body: '', id, role: 'assistant' }];
};

/**
 * True when an assistant turn ended in failure: its terminal usage event
 * carries an error, or the backend hit a usage limit.
 */
export const didTurnFail = (message: ChatMessage | undefined): boolean => {
  return (message?.events ?? []).some((event) => {
    return (
      event.kind === 'usageLimit' ||
      (event.kind === 'usage' && event.error !== null)
    );
  });
};
