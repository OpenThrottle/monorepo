import type { AgentConversationListItem } from '../types';
import type { ConversationDateSectionKey } from './conversation-sections';

const CONVERSATION_PREFIX = 'conversation:';
const SECTION_PREFIX = 'section:';

/**
 * What a conversation drop asks the host to do: pin, move into a group, or
 * ungroup and unpin (a drop on a date section).
 */
export type ConversationDropAction =
  | { readonly groupId: string; readonly kind: 'move-to-group' }
  | { readonly kind: 'pin' }
  | { readonly kind: 'ungroup' };

/** @description Draggable id of a conversation row: `conversation:<id>`. */
export const conversationDragId = (conversationId: string): string => {
  return `${CONVERSATION_PREFIX}${conversationId}`;
};

/** @description Inverse of {@link conversationDragId}; null for any other id. */
export const parseConversationDragId = (id: string): string | null => {
  return id.startsWith(CONVERSATION_PREFIX)
    ? id.slice(CONVERSATION_PREFIX.length)
    : null;
};

/** @description Droppable id of a user group's section: `section:group:<id>`. */
export const groupSectionId = (groupId: string): string => {
  return `${SECTION_PREFIX}group:${groupId}`;
};

/** @description Droppable id of Pinned or a date section: `section:<key>`. */
export const dateSectionId = (key: ConversationDateSectionKey): string => {
  return `${SECTION_PREFIX}${key}`;
};

/**
 * @description The action a drop of `conversation` on the droppable `overId`
 * means, or null for a no-op: no target, a non-section target, or the row's
 * current section (Pinned when pinned, else its group, else a date section).
 * A date section is not told apart from the row's own: any drop on one of them
 * ungroups and unpins, which is a no-op for a row that is already loose.
 */
export const resolveConversationDrop = (
  conversation: Pick<AgentConversationListItem, 'groupId' | 'pinned'>,
  overId: string | null,
): ConversationDropAction | null => {
  if (overId == null || !overId.startsWith(SECTION_PREFIX)) {
    return null;
  }
  const target = overId.slice(SECTION_PREFIX.length);
  const groupPrefix = 'group:';

  if (target === 'pinned') {
    return conversation.pinned ? null : { kind: 'pin' };
  }
  if (target.startsWith(groupPrefix)) {
    const groupId = target.slice(groupPrefix.length);
    const isCurrent = !conversation.pinned && conversation.groupId === groupId;

    return isCurrent ? null : { groupId, kind: 'move-to-group' };
  }
  const isLoose = !conversation.pinned && conversation.groupId == null;

  return isLoose ? null : { kind: 'ungroup' };
};
