import type { ChatMessage } from '../types';

/**
 * Id of the last `user` message in the thread, or null when there is none. A
 * change in this id between renders means the user just sent a new message —
 * which is what re-pins the thread to the bottom. Kept out of
 * {@link ChatThread} per the repo's component/utils split.
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
