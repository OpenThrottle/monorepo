import type { ChatMessage } from '../types';

/**
 * Human role labels for a chat thread row. Kept out of {@link ChatThreadMessage}
 * per the repo's component/data split.
 * @public
 */
export const CHAT_ROLE_LABEL: Record<ChatMessage['role'], string> = {
  assistant: 'Clutch Assistant',
  system: 'System',
  user: 'You',
};
