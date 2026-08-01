import type { ChatMessage } from '../types';

/**
 * True once an assistant turn has streamed its first content — a non-empty body
 * or at least one structured event. While `pending` (request in flight) both
 * are empty, so this stays false until the first token lands. Kept out of
 * {@link ChatThread} per the repo's component/utils split.
 */
export const hasStreamedContent = (message: ChatMessage): boolean =>
  message.body.trim().length > 0 || (message.events?.length ?? 0) > 0;

/**
 * Id of the last `user` message in the thread, or null when there is none. A
 * change in this id between renders means the user just sent a new message.
 */
export const findLastUserMessageId = (
  messages: readonly ChatMessage[],
): string | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'user') {
      return message.id;
    }
  }
  return null;
};

/** The last `assistant` message in the thread, or undefined when there is none. */
export const findLastAssistantMessage = (
  messages: readonly ChatMessage[],
): ChatMessage | undefined => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant') {
      return message;
    }
  }
  return undefined;
};
