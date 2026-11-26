import { useDroppable } from '@dnd-kit/core';
import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { DROP_TARGET_CLASSES } from '../data/chat-conversation-row.classes';

export interface ChatConversationDropSectionProps {
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
  /** Droppable id, `section:<key>` (see `conversation-drag`). */
  readonly dropId: string;
  /** False renders a plain section (no grouping, so no drag and drop). */
  readonly enabled: boolean;
}

/**
 * @description A sidebar section that accepts dragged conversation rows
 * ({@link ChatConversationDndContext}). Highlights while a row hovers it.
 */
export const ChatConversationDropSection = (
  props: ChatConversationDropSectionProps,
): React.ReactElement => {
  const { ariaLabel, children, dropId, enabled } = props;

  // Hooks
  const { isOver, setNodeRef } = useDroppable({
    disabled: !enabled,
    id: dropId,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={ariaLabel}
      className={cn(isOver && DROP_TARGET_CLASSES)}
      ref={setNodeRef}
    >
      {children}
    </section>
  );
};
