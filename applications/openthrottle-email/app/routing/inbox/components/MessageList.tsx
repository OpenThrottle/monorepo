import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { Link } from 'react-router';
import { ConfirmModal } from '~/global/components/ConfirmModal';
import { mailInboxMessagePath } from '~/global/data/data.navigation';
import { MESSAGE_LIST_EMPTY_COPY } from '~/routing/inbox/data/data.copy';
import { MessageListBulkActions } from '~/routing/inbox/components/MessageListBulkActions';
import { MessageListSkeleton } from '~/routing/inbox/components/MessageListSkeleton';
import { useMessageListSelection } from '~/routing/inbox/hooks/useMessageListSelection';
import type { MailFolderId, MailMessageSummary } from '~/types/mail';
import { MAIL_FOLDER_IDS } from '~/types/mail';

export interface MessageListProps {
  readonly className?: string;
  /** Current folder for empty-state copy and future behavior (e.g. bulk actions). */
  readonly folderId?: MailFolderId;
  /** When true, show skeleton rows instead of content. For future loader defer or navigation pending. */
  readonly loading?: boolean;
  readonly messages?: readonly MailMessageSummary[];
  /** Called when user moves selected messages to a folder; wire to move-message API. */
  readonly onMoveToFolder?: (
    messageIds: ReadonlySet<string>,
    folderId: MailFolderId,
  ) => void;
  /** Called when selection changes. Enables select-all and per-row checkboxes when provided. */
  readonly onSelectionChange?: (ids: Set<string>) => void;
  /** Controlled selected message ids for bulk actions. When set, onSelectionChange should be provided. */
  readonly selectedIds?: ReadonlySet<string>;
}

/**
 * @description Inbox (and folder) message list: table with optional loading skeleton, empty state, selection, and bulk actions.
 * Uses shadcn-ui Table, Empty, Skeleton, Button, DropdownMenu. Preserve data-testid and code comments for future integration.
 */
export const MessageList = (props: MessageListProps): React.ReactElement => {
  const {
    className,
    folderId = MAIL_FOLDER_IDS.inbox,
    loading = false,
    messages = [],
    onMoveToFolder,
    onSelectionChange,
    selectedIds,
  } = props;

  // Hooks
  const {
    handleBulkDeleteConfirm,
    handleCancelBulkDelete,
    handleRequestBulkDelete,
    handleSelectAll,
    handleSelectOne,
    hasSelection,
    isAllSelected,
    selectAllRef,
    selectedSet,
    showDeleteConfirm,
  } = useMessageListSelection({ messages, onSelectionChange, selectedIds });

  // Setup
  const selectionEnabled = onSelectionChange != null;
  const emptyCopy = MESSAGE_LIST_EMPTY_COPY[folderId];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // Loading: show skeleton table.
  if (loading) {
    return (
      <div className={clsx('p-4', className)} data-testid="MessageList">
        <MessageListSkeleton selectionEnabled={selectionEnabled} />
      </div>
    );
  }

  // Empty: show Empty component with folder-specific copy.
  if (messages.length === 0) {
    return (
      <div className={clsx('p-4', className)} data-testid="MessageList">
        <Empty className="min-h-[280px]">
          <EmptyHeader>
            <EmptyTitle>{emptyCopy.title}</EmptyTitle>
            <EmptyDescription>{emptyCopy.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div
      className={clsx('flex flex-col gap-2 p-4', className)}
      data-testid="MessageList"
    >
      {/* Bulk actions bar when 1+ rows selected. Wire Mark read / Delete to API when backend exists. */}
      {selectionEnabled && hasSelection && (
        <MessageListBulkActions
          folderId={folderId}
          onClearSelection={() => onSelectionChange(new Set())}
          onMoveToFolder={(targetFolderId) =>
            onMoveToFolder?.(selectedSet, targetFolderId)
          }
          onRequestDelete={handleRequestBulkDelete}
          selectedCount={selectedSet.size}
        />
      )}

      {/* Confirm modal for bulk delete. */}
      <ConfirmModal
        confirmLabel="Move to trash"
        description={`${selectedSet.size} message(s) will be moved to trash. You can recover them from trash before they are permanently deleted.`}
        destructive={true}
        onCancel={handleCancelBulkDelete}
        onConfirm={handleBulkDeleteConfirm}
        open={showDeleteConfirm}
        title="Move selected to trash?"
      />

      <Table>
        <TableHeader>
          <TableRow>
            {selectionEnabled && (
              <TableHead className="w-10">
                <input
                  aria-label="Select all"
                  checked={isAllSelected}
                  className="border-input h-4 w-4 rounded"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  ref={selectAllRef}
                  type="checkbox"
                />
              </TableHead>
            )}
            <TableHead className="w-[40%]">Subject</TableHead>
            <TableHead className="w-[30%]">From</TableHead>
            <TableHead className="w-[20%]">Date</TableHead>
            <TableHead className="w-[10%]">Read</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((msg) => {
            const isSelected = selectedSet.has(msg.id);
            return (
              <TableRow
                className={clsx(
                  msg.read ? 'font-normal' : 'font-medium',
                  isSelected && 'bg-muted',
                )}
                data-state={isSelected ? 'selected' : undefined}
                key={msg.id}
              >
                {selectionEnabled && (
                  <TableCell
                    className="w-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      aria-label={`Select ${msg.subject}`}
                      checked={isSelected}
                      className="border-input h-4 w-4 rounded"
                      onChange={(e) =>
                        handleSelectOne(msg.id, e.target.checked)
                      }
                      type="checkbox"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link
                    className="text-primary focus-visible:ring-ring hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline"
                    to={mailInboxMessagePath(msg.id)}
                    viewTransition={true}
                  >
                    {msg.subject}
                  </Link>
                </TableCell>
                <TableCell>{msg.from}</TableCell>
                <TableCell>{msg.date}</TableCell>
                <TableCell>{msg.read ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
