import { Button, cn, Input } from '@openthrottle/react-router-shadcn';
import { Pencil, SendHorizontal, X } from 'lucide-react';
import * as React from 'react';

import { CHAT_QUEUED_MESSAGES_COPY } from '../data/copy';
import type { ChatQueuedMessage } from '../types';

export interface ChatQueuedMessageRowProps {
  readonly item: ChatQueuedMessage;
  /** Save edited text; an empty edit removes the message. */
  readonly onEdit: (id: string, message: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onSendNow: (id: string) => void;
}

/**
 * @description One queued chat message: its text with Send now, Edit and
 * Remove actions. Edit swaps the text for an input; Enter saves, Escape cancels.
 */
export const ChatQueuedMessageRow = (
  props: ChatQueuedMessageRowProps,
): React.ReactElement => {
  const { item, onEdit, onRemove, onSendNow } = props;

  // Hooks
  const [draft, setDraft] = React.useState<string | null>(null);

  // Setup
  const isEditing = draft !== null;
  const copy = CHAT_QUEUED_MESSAGES_COPY;

  // Handlers
  const onSave = (): void => {
    if (draft !== null) {
      onEdit(item.id, draft);
    }
    setDraft(null);
  };

  const onInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(null);
    }
  };

  // Markup
  const editor = (
    <>
      <Input
        aria-label={copy.editLabel}
        autoFocus={true}
        className="h-8 flex-1"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onInputKeyDown}
        value={draft ?? ''}
      />
      <Button onClick={onSave} size="sm" type="button">
        {copy.save}
      </Button>
      <Button
        onClick={() => setDraft(null)}
        size="sm"
        type="button"
        variant="ghost"
      >
        {copy.cancelEdit}
      </Button>
    </>
  );
  const viewer = (
    <>
      <p className="min-w-0 flex-1 truncate text-sm" title={item.message}>
        {item.message}
      </p>
      <Button
        onClick={() => onSendNow(item.id)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <SendHorizontal aria-hidden="true" />
        {copy.sendNow}
      </Button>
      <Button
        aria-label={copy.edit}
        onClick={() => setDraft(item.message)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Pencil aria-hidden="true" />
      </Button>
      <Button
        aria-label={copy.remove}
        onClick={() => onRemove(item.id)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" />
      </Button>
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn('flex items-center gap-1 py-1', isEditing && 'gap-2')}
      data-testid="ChatQueuedMessageRow"
    >
      {isEditing ? editor : viewer}
    </li>
  );
};
