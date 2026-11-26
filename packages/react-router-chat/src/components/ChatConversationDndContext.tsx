import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import * as React from 'react';

import { DRAG_OVERLAY_CLASSES } from '../data/chat-conversation-row.classes';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type {
  AgentConversationListItem,
  ChatConversationGrouping,
} from '../types';
import {
  parseConversationDragId,
  resolveConversationDrop,
} from '../utils/conversation-drag';

/** Pixels the pointer must travel before a press becomes a drag. */
const ACTIVATION_DISTANCE = 6;

export interface ChatConversationDndContextProps {
  readonly children: React.ReactNode;
  readonly conversations: readonly AgentConversationListItem[];
  /** Undefined (admin) renders the children with no drag and drop. */
  readonly grouping: ChatConversationGrouping | undefined;
}

/**
 * @description The sidebar's single drag-and-drop context. A dropped row is
 * turned into `onSetPinned` / `onMoveToGroup` calls via
 * `resolveConversationDrop`; those hooks already apply the change at once and
 * toast on failure. Group reordering can add sortable headers inside it.
 */
export const ChatConversationDndContext = (
  props: ChatConversationDndContextProps,
): React.ReactElement => {
  const { children, conversations, grouping } = props;

  // Hooks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: ACTIVATION_DISTANCE },
    }),
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const findConversation = (
    dragId: string,
  ): AgentConversationListItem | undefined => {
    const id = parseConversationDragId(dragId);

    return conversations.find((conversation) => conversation.id === id);
  };
  const active = activeId == null ? undefined : findConversation(activeId);
  const activeTitle = active?.title?.trim() ?? '';
  const overlayLabel = activeTitle === '' ? copy.untitled : activeTitle;

  // Handlers
  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveId(null);
    const conversation = findConversation(String(event.active.id));
    const overId = event.over == null ? null : String(event.over.id);
    if (conversation == null || grouping == null) {
      return;
    }
    const action = resolveConversationDrop(conversation, overId);
    if (action?.kind === 'pin') {
      grouping.onSetPinned(conversation.id, true);
    } else if (action?.kind === 'move-to-group') {
      grouping.onMoveToGroup(conversation.id, action.groupId);
    } else if (action?.kind === 'ungroup') {
      if (conversation.groupId != null) {
        grouping.onMoveToGroup(conversation.id, null);
      }
      if (conversation.pinned) {
        grouping.onSetPinned(conversation.id, false);
      }
    }
  };

  const handleDragCancel = (): void => {
    setActiveId(null);
  };

  // Markup
  const overlay = (
    <DragOverlay dropAnimation={null}>
      {active == null ? null : (
        <div className={DRAG_OVERLAY_CLASSES}>{overlayLabel}</div>
      )}
    </DragOverlay>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (grouping == null) {
    return <>{children}</>;
  }

  return (
    <DndContext
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      {children}
      {overlay}
    </DndContext>
  );
};
