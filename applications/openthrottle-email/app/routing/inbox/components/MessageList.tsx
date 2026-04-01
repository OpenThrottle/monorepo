import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { toast } from 'sonner';
import classnames from 'classnames';
import { Link } from 'react-router';
import { ConfirmModal } from '~/global/components/ConfirmModal';
import { MoveToFolderDropdown } from '~/global/components/MoveToFolderDropdown';
import { mailInboxMessagePath } from '~/global/data/data.navigation';
import { MOCK_FOLDERS } from '~/global/data/mock.mail';
import type { MailFolderId, MailMessageSummary } from '~/types/mail';
import { MAIL_FOLDER_IDS } from '~/types/mail';

/** Copy for empty state per folder. Used when messages.length === 0. */
const EMPTY_COPY: Record<
  MailFolderId,
  { readonly title: string; readonly description: string }
> = {
  [MAIL_FOLDER_IDS.inbox]: {
    description: 'New messages will appear here.',
    title: 'No messages in Inbox',
  },
  [MAIL_FOLDER_IDS.sent]: {
    description: 'Messages you send will appear here.',
    title: 'No sent messages',
  },
  [MAIL_FOLDER_IDS.drafts]: {
    description: 'Drafts you save will appear here.',
    title: 'No drafts',
  },
  [MAIL_FOLDER_IDS.trash]: {
    description: 'Deleted messages will appear here.',
    title: 'Trash is empty',
  },
};

export interface MessageListProps {
  /** Current folder for empty-state copy and future behavior (e.g. bulk actions). */
  readonly folderId?: MailFolderId;
  readonly className?: string;
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
export const MessageList = (props: MessageListProps) => {
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
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Setup
  const selectionEnabled = onSelectionChange != null;
  const selectedSet = selectedIds ?? new Set<string>();
  const hasSelection = selectedSet.size > 0;
  const emptyCopy = EMPTY_COPY[folderId];
  const isAllSelected =
    messages.length > 0 && messages.every((m) => selectedSet.has(m.id));
  const isSomeSelected = messages.some((m) => selectedSet.has(m.id));

  React.useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = isSomeSelected && !isAllSelected;
  }, [isSomeSelected, isAllSelected]);

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? new Set(messages.map((m) => m.id)) : new Set());
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  const handleBulkDeleteConfirm = React.useCallback(() => {
    // Wire to delete/move-to-trash API when backend exists; for now clear selection and toast.
    onSelectionChange?.(new Set());
    setShowDeleteConfirm(false);
    toast.success(`${selectedSet.size} message(s) moved to trash`);
  }, [onSelectionChange, selectedSet.size]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit — loading: show skeleton table
  if (loading) {
    return (
      <div className={classnames('p-4', className)} data-testid="MessageList">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionEnabled && <TableHead className="w-10" />}
              <TableHead className="w-[40%]">Subject</TableHead>
              <TableHead className="w-[30%]">From</TableHead>
              <TableHead className="w-[20%]">Date</TableHead>
              <TableHead className="w-[10%]">Read</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {selectionEnabled && (
                  <TableCell className="w-10">
                    <Skeleton className="h-4 w-4 rounded" />
                  </TableCell>
                )}
                <TableCell>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // 🔌 Short Circuit — empty: show Empty component with folder-specific copy
  if (messages.length === 0) {
    return (
      <div className={classnames('p-4', className)} data-testid="MessageList">
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
      className={classnames('flex flex-col gap-2 p-4', className)}
      data-testid="MessageList"
    >
      {/* Bulk actions bar when 1+ rows selected. Wire Mark read / Delete to API when backend exists. */}
      {selectionEnabled && hasSelection && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2"
          data-testid="MessageList-bulkActions"
        >
          <span className="text-sm text-muted-foreground">
            {selectedSet.size} selected
          </span>
          <Button
            onClick={() => {
              /* TODO: wire to mark-read API */
            }}
            size="sm"
            variant="outline"
          >
            Mark read
          </Button>
          <Button
            data-testid="MessageList-bulkDelete"
            onClick={() => setShowDeleteConfirm(true)}
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
              <DropdownMenuItem>Mark unread</DropdownMenuItem>
              <MoveToFolderDropdown
                currentFolderId={folderId}
                folders={MOCK_FOLDERS}
                onSelect={(targetFolderId) =>
                  onMoveToFolder?.(selectedSet, targetFolderId)
                }
                triggerLabel="Move to folder…"
              />
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => onSelectionChange(new Set())}
            size="sm"
            variant="ghost"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Confirm modal for bulk delete. */}
      <ConfirmModal
        confirmLabel="Move to trash"
        description={`${selectedSet.size} message(s) will be moved to trash. You can recover them from trash before they are permanently deleted.`}
        destructive={true}
        onCancel={() => setShowDeleteConfirm(false)}
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
                  className="h-4 w-4 rounded border-input"
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
                className={classnames(
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
                      className="h-4 w-4 rounded border-input"
                      onChange={(e) =>
                        handleSelectOne(msg.id, e.target.checked)
                      }
                      type="checkbox"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link
                    className="text-primary hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded"
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
