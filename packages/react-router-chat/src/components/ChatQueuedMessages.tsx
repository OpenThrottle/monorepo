import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_QUEUED_MESSAGES_COPY } from '../data/data.copy';
import type { ChatQueuedMessage } from '../types';
import { ChatQueuedMessageRow } from './ChatQueuedMessageRow';

export interface ChatQueuedMessagesProps {
  readonly className?: string;
  /** True after Stop or a failed turn: show Resume and the paused note. */
  readonly isPaused: boolean;
  /** Queued messages, oldest first. Renders nothing when empty. */
  readonly items: readonly ChatQueuedMessage[];
  readonly onClear: () => void;
  readonly onEdit: (id: string, message: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResume: () => void;
  readonly onSendNow: (id: string) => void;
}

/**
 * @description Messages the user sent while a reply was still running, shown
 * above the composer in send order, each editable, removable or sendable now.
 * When the queue is paused (after Stop or a failed reply) it says so and offers
 * Resume. Notes that the queue does not survive a reload. Presentational: the
 * caller owns the queue (see {@link useAgenticChatTurn}).
 * @public
 */
export const ChatQueuedMessages = (
  props: ChatQueuedMessagesProps,
): React.ReactElement | null => {
  const {
    className,
    isPaused,
    items,
    onClear,
    onEdit,
    onRemove,
    onResume,
    onSendNow,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_QUEUED_MESSAGES_COPY;
  const note = isPaused ? copy.paused : copy.lostOnReload;

  // Handlers

  // Markup
  const rows = items.map((item) => (
    <ChatQueuedMessageRow
      item={item}
      key={item.id}
      onEdit={onEdit}
      onRemove={onRemove}
      onSendNow={onSendNow}
    />
  ));

  // Life Cycle

  // 🔌 Short Circuit
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={copy.heading}
      className={cn('bg-muted/40 rounded-md border px-3 py-2', className)}
      data-testid="ChatQueuedMessages"
    >
      <header className="flex items-center gap-2">
        <h3 className="text-muted-foreground text-xs font-medium uppercase">
          {copy.heading} · {items.length}
        </h3>
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {note}
        </p>
        {isPaused && (
          <Button onClick={onResume} size="sm" type="button" variant="outline">
            {copy.resume}
          </Button>
        )}
        <Button onClick={onClear} size="sm" type="button" variant="ghost">
          {copy.clear}
        </Button>
      </header>
      <ol className="divide-y">{rows}</ol>
    </section>
  );
};
