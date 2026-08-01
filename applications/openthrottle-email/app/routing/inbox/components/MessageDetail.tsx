import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { ConfirmModal } from '~/global/components/ConfirmModal';
import { MessageDetailActions } from '~/routing/inbox/components/MessageDetailActions';
import { MessageDetailSkeleton } from '~/routing/inbox/components/MessageDetailSkeleton';
import { useMessageDetail } from '~/routing/inbox/hooks/useMessageDetail';
import type { MailFolderId, MailMessageDetail } from '~/types/mail';

/** Callbacks for reading pane actions; wire to compose route and API when backend is ready. */
interface MessageDetailActionCallbacks {
  readonly onArchive?: (message: MailMessageDetail) => void;
  readonly onDelete?: (message: MailMessageDetail) => void;
  readonly onForward?: (message: MailMessageDetail) => void;
  /** Move message to folder; wire to move-message API. */
  readonly onMoveToFolder?: (
    message: MailMessageDetail,
    folderId: MailFolderId,
  ) => void;
  readonly onReply?: (message: MailMessageDetail) => void;
  readonly onReplyAll?: (message: MailMessageDetail) => void;
}

export interface MessageDetailProps extends MessageDetailActionCallbacks {
  readonly className?: string;
  /** When true, show skeleton for header and body; used when loader defers or fetches async. */
  readonly loading?: boolean;
  readonly message?: MailMessageDetail | null;
}

/**
 * @description Reading pane: displays a single message with metadata, body, actions bar (reply, forward, archive, delete), and optional attachments placeholder.
 * Uses shadcn-ui Card, Button, DropdownMenu, Skeleton, Badge. Reply/Forward link to compose route with query params for future integration.
 */
export const MessageDetail = (
  props: MessageDetailProps,
): React.ReactElement => {
  const {
    className,
    loading = false,
    message,
    onArchive,
    onDelete,
    // onForward,
    onMoveToFolder,
    // onReply,
    // onReplyAll,
  } = props;

  // Hooks
  const {
    confirmAction,
    handleArchiveClick,
    handleCancelConfirm,
    handleConfirmArchive,
    handleConfirmDelete,
    handleDeleteClick,
  } = useMessageDetail({ message, onArchive, onDelete });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // Empty state when no message selected.
  if (message == null && !loading) {
    return (
      <div
        className={clsx('text-muted-foreground p-4', className)}
        data-testid="MessageDetail"
      >
        Select a message
      </div>
    );
  }

  // Loading skeleton for header + body (e.g. when loader uses defer or async fetch)
  if (loading || message == null) {
    return (
      <div className={clsx('p-4', className)} data-testid="MessageDetail">
        <MessageDetailSkeleton />
      </div>
    );
  }

  // Message is non-null here: the short circuits above return for null/loading,
  // so TS narrows `message` to MailMessageDetail without a cast.
  const msg = message;

  const attachments = msg.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  return (
    <div className={clsx('p-4', className)} data-testid="MessageDetail">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>{msg.subject}</CardTitle>
          <CardDescription>
            From: {msg.from} · To: {msg.to} · {msg.date}
          </CardDescription>
        </CardHeader>

        {/* Actions bar: Reply, Reply all, Forward (Link to compose); Archive, Delete (confirm modals); More (DropdownMenu). Tooltips on each action. */}
        <MessageDetailActions
          message={msg}
          onArchiveClick={handleArchiveClick}
          onDeleteClick={handleDeleteClick}
          onMoveToFolder={onMoveToFolder}
        />

        {/* Confirm modals for archive and delete. */}
        <ConfirmModal
          confirmLabel="Archive"
          description="This message will be moved to your archive. You can find it there later."
          destructive={false}
          onCancel={handleCancelConfirm}
          onConfirm={handleConfirmArchive}
          open={confirmAction === 'archive'}
          title="Archive message?"
        />
        <ConfirmModal
          confirmLabel="Move to trash"
          description="This message will be moved to trash. You can recover it from trash before it is permanently deleted."
          destructive={true}
          onCancel={handleCancelConfirm}
          onConfirm={handleConfirmDelete}
          open={confirmAction === 'delete'}
          title="Move to trash?"
        />

        <CardContent className="pt-4">
          {/* Body: plain text with preserved line breaks; safe HTML can be wired when API provides it. */}
          <div className="text-sm whitespace-pre-wrap">{msg.body}</div>

          {/* Attachments placeholder: list names with Badge; wire to download/API when backend exists. */}
          {hasAttachments ? (
            <div
              className="border-border mt-4 border-t pt-4"
              data-testid="MessageDetail-attachments"
            >
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                Attachments
              </p>
              <ul className="flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <li key={`${att.name}-${index}`}>
                    <Badge className="font-normal" variant="secondary">
                      {att.name}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
