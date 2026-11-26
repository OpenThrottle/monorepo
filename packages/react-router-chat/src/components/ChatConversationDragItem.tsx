import { useDraggable } from '@dnd-kit/core';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { DRAGGING_ROW_CLASSES } from '../data/chat-conversation-row.classes';

export interface ChatConversationDragItemProps {
  readonly children: React.ReactNode;
  /** Draggable id, `conversation:<id>` (see `conversation-drag`). */
  readonly dragId: string;
  /** False (no grouping, or the row is being renamed) leaves the row inert. */
  readonly enabled: boolean;
}

/**
 * @description Makes a {@link ChatConversationRow} draggable by the whole row.
 * Only the pointer listeners are attached, and the sensor needs a movement
 * threshold, so click-to-open, double-click rename, F2, Enter/Space and the
 * row menu keep working; keyboard users move rows from the menu.
 */
export const ChatConversationDragItem = (
  props: ChatConversationDragItemProps,
): React.ReactElement => {
  const { children, dragId, enabled } = props;

  // Hooks
  const { isDragging, listeners, setNodeRef } = useDraggable({
    disabled: !enabled,
    id: dragId,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(isDragging && DRAGGING_ROW_CLASSES)}
      ref={setNodeRef}
      {...listeners}
    >
      {children}
    </div>
  );
};
