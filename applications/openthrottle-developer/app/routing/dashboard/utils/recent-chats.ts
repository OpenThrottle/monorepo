import type { AgentConversationListItem } from '@openthrottle/react-router-chat';
import { RECENT_CHATS_CARD_COPY } from '~/routing/dashboard/data/data.copy';

/**
 * @description Deep-link into a specific chat on the home route
 * (`routes/_index.tsx` restores the conversation from `?conversationId=`).
 */
export const conversationHref = (id: string): string =>
  `/?conversationId=${encodeURIComponent(id)}`;

/**
 * @description Display label for a conversation, falling back to the
 * "Untitled chat" copy when the title is null or blank.
 */
export const conversationLabel = (
  conversation: AgentConversationListItem,
): string =>
  conversation.title != null && conversation.title.trim() !== ''
    ? conversation.title
    : RECENT_CHATS_CARD_COPY.untitled;
