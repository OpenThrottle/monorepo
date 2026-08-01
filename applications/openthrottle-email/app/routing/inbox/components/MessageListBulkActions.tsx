import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { MoveToFolderDropdown } from '~/global/components/MoveToFolderDropdown';
import { MOCK_FOLDERS } from '~/global/data/mock.mail';
import type { MailFolderId } from '~/types/mail';

export interface MessageListBulkActionsProps {
  /** Current folder, disabled in the Move-to-folder list. */
  readonly folderId: MailFolderId;
  /** Clears the current selection. */
  readonly onClearSelection: () => void;
  /** Called when user moves the selected messages to a folder; wire to move-message API. */
  readonly onMoveToFolder: (folderId: MailFolderId) => void;
  /** Opens the bulk-delete confirm modal. */
  readonly onRequestDelete: () => void;
  /** Number of selected messages, for the "N selected" label. */
  readonly selectedCount: number;
}

/**
 * @description Bulk actions bar for {@link MessageList} when 1+ rows are
 * selected. Wire Mark read / Delete to API when backend exists.
 */
export const MessageListBulkActions = (
  props: MessageListBulkActionsProps,
): React.ReactElement => {
  const {
    folderId,
    onClearSelection,
    onMoveToFolder,
    onRequestDelete,
    selectedCount,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
      data-testid="MessageList-bulkActions"
    >
      <span className="text-muted-foreground text-sm">
        {selectedCount} selected
      </span>
      {/* Disabled until the mark-read API is wired, so it doesn't read as a broken no-op. */}
      <Button disabled={true} size="sm" variant="outline">
        Mark read (coming soon)
      </Button>
      <Button
        data-testid="MessageList-bulkDelete"
        onClick={onRequestDelete}
        size="sm"
        variant="outline"
      >
        Delete
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button size="sm" variant="ghost">
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {/* Disabled until the mark-unread API is wired. */}
          <DropdownMenuItem disabled={true}>
            Mark unread (coming soon)
          </DropdownMenuItem>
          <MoveToFolderDropdown
            currentFolderId={folderId}
            folders={MOCK_FOLDERS}
            onSelect={onMoveToFolder}
            triggerLabel="Move to folder…"
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={onClearSelection} size="sm" variant="ghost">
        Clear selection
      </Button>
    </div>
  );
};
