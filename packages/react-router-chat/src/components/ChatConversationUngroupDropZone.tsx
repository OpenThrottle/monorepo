import { useDndContext } from '@dnd-kit/core';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { dateSectionId } from '../utils/conversation-drag';
import { ChatConversationDropSection } from './ChatConversationDropSection';

export interface ChatConversationUngroupDropZoneProps {
  /** False when a date section already takes the drop (or there is no drag and drop). */
  readonly enabled: boolean;
}

/**
 * @description A Today drop target shown only while a row is being dragged
 * and no date section is listed (every conversation is pinned or grouped), so
 * there is always somewhere to drop a row to unpin or ungroup it.
 */
export const ChatConversationUngroupDropZone = (
  props: ChatConversationUngroupDropZoneProps,
): React.ReactElement | null => {
  const { enabled } = props;

  // Hooks
  const { active } = useDndContext();

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!enabled || active == null) {
    return null;
  }

  return (
    <ChatConversationDropSection
      ariaLabel={copy.sectionToday}
      dropId={dateSectionId('today')}
      enabled={true}
    >
      <h3 className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
        {copy.sectionToday}
      </h3>
      <p
        className="text-muted-foreground border-sidebar-border mx-2 rounded-md border border-dashed px-3 py-2 text-xs"
        data-testid="ChatConversationSidebar-ungroup-drop-zone"
      >
        {copy.dropToUngroup}
      </p>
    </ChatConversationDropSection>
  );
};
