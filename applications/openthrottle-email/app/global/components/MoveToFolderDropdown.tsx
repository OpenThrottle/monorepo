import * as React from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@openthrottle/react-router-shadcn';
import type { MailFolder, MailFolderId } from '~/types/mail';

interface MoveToFolderDropdownProps {
  /** List of folders to show; typically MOCK_FOLDERS or API result. */
  readonly folders: readonly MailFolder[];
  /** Current folder id to disable in the list (e.g. message already in this folder). */
  readonly currentFolderId?: MailFolderId;
  /** Called when user selects a folder; wire to move-message API. */
  readonly onSelect: (folderId: MailFolderId) => void;
  /** Label for the submenu trigger. */
  readonly triggerLabel?: string;
}

/**
 * @description Renders a "Move to folder" submenu for use inside a DropdownMenu. Lists folders as menu items; onSelect is called when user picks a folder. Wire to move-message API in reading pane and list bulk actions.
 */
export const MoveToFolderDropdown = (props: MoveToFolderDropdownProps) => {
  const {
    currentFolderId,
    folders,
    onSelect,
    triggerLabel = 'Move to folder',
  } = props;

  // Hooks

  // Setup

  // Handlers
  const handleSelect = React.useCallback(
    (folderId: MailFolderId) => {
      onSelect(folderId);
    },
    [onSelect],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-testid="MoveToFolderDropdown-trigger">
        {triggerLabel}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent data-testid="MoveToFolderDropdown-content">
        {folders.map((folder) => {
          const isCurrent = folder.id === currentFolderId;
          return (
            <DropdownMenuItem
              data-testid={`MoveToFolderDropdown-item-${folder.id}`}
              disabled={isCurrent}
              key={folder.id}
              onClick={() => !isCurrent && handleSelect(folder.id)}
            >
              {folder.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
