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

/**
 * @description Bake every streamed turn into its placeholder so the thread keeps
 * those replies once the live stream re-keys to another conversation id and
 * drops its accumulation. A Private-mode turn gets a fresh synthetic id per turn
 * and has no persisted rows to fall back on, so without this an earlier reply
 * renders empty after the next message.
 */
export const bakeStreamedMessages = (
  messages: readonly ChatMessage[],
  streamedById: ReadonlyMap<string, ChatMessage>,
): ChatMessage[] => {
  return messages.map((message) =>
    overlayStreamedMessage(message, streamedById.get(message.id)),
  );
};

/**
 * @description Append the streamed turns the thread has no row for yet, in stream
 * order, after the last thread message. Reopening a conversation mid-turn loads
 * only its persisted rows (the assistant row is written when the turn ends), so
 * the running reply exists only in the replayed stream. A streamed id the thread
 * already holds is left to {@link overlayStreamedMessage}, so a turn that
 * finished while away is never shown twice.
 */
export const appendStreamedOnlyMessages = (
  messages: readonly ChatMessage[],
  streamed: readonly ChatMessage[],
): readonly ChatMessage[] => {
  const knownIds = new Set(messages.map((message) => message.id));
  const streamedOnly = streamed.filter((message) => !knownIds.has(message.id));

  if (streamedOnly.length === 0) {
    return messages;
  }

  return [...messages, ...streamedOnly];
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
