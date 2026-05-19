import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';
import { ArrowBendUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowBendUpLeft';
import { ArrowBendDoubleUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowBendDoubleUpLeft';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { Link } from 'react-router';
import { ConfirmModal } from '~/global/components/ConfirmModal';
import { MoveToFolderDropdown } from '~/global/components/MoveToFolderDropdown';
import { MAIL_PATHS } from '~/global/data/data.navigation';
import { MOCK_FOLDERS } from '~/global/data/mock.mail';
import type { MailMessageDetail } from '~/types/mail';
import type { MailFolderId } from '~/types/mail';

type ConfirmAction = 'archive' | 'delete' | null;

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

interface MessageDetailProps extends MessageDetailActionCallbacks {
  readonly className?: string;
  /** When true, show skeleton for header and body; used when loader defers or fetches async. */
  readonly loading?: boolean;
  readonly message?: MailMessageDetail | null;
}

/**
 * @description Reading pane: displays a single message with metadata, body, actions bar (reply, forward, archive, delete), and optional attachments placeholder.
 * Uses shadcn-ui Card, Button, DropdownMenu, Skeleton, Badge. Reply/Forward link to compose route with query params for future integration.
 */
export const MessageDetail = (props: MessageDetailProps) => {
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
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);

  // Setup

  // Handlers — Reply/Forward use Link to compose; Archive/Delete open confirm modal then call callbacks.
  const handleArchiveClick = React.useCallback(() => {
    if (message != null) setConfirmAction('archive');
  }, [message]);

  const handleDeleteClick = React.useCallback(() => {
    if (message != null) setConfirmAction('delete');
  }, [message]);

  const handleConfirmArchive = React.useCallback(() => {
    if (message != null) {
      onArchive?.(message);
      setConfirmAction(null);
      toast.success('Message archived');
    }
  }, [message, onArchive]);

  const handleConfirmDelete = React.useCallback(() => {
    if (message != null) {
      onDelete?.(message);
      setConfirmAction(null);
      toast.success('Message moved to trash');
    }
  }, [message, onDelete]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit — empty state when no message selected
  if (message == null && !loading) {
    return (
      <div
        className={classnames('p-4 text-muted-foreground', className)}
        data-testid="MessageDetail"
      >
        Select a message
      </div>
    );
  }

  // Loading skeleton for header + body (e.g. when loader uses defer or async fetch)
  if (loading) {
    return (
      <div className={classnames('p-4', className)} data-testid="MessageDetail">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton
              className="h-6 w-3/4"
              data-testid="MessageDetail-skeleton-title"
            />
            <Skeleton
              className="h-4 w-full"
              data-testid="MessageDetail-skeleton-description"
            />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton
              className="h-4 w-full"
              data-testid="MessageDetail-skeleton-line1"
            />
            <Skeleton
              className="h-4 w-full"
              data-testid="MessageDetail-skeleton-line2"
            />
            <Skeleton
              className="h-4 w-2/3"
              data-testid="MessageDetail-skeleton-line3"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Message is non-null here after short circuits

  // FIXME: Swap out eventually

  const msg = message as MailMessageDetail;

  const attachments = msg.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  return (
    <div className={classnames('p-4', className)} data-testid="MessageDetail">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>{msg.subject}</CardTitle>
          <CardDescription>
            From: {msg.from} · To: {msg.to} · {msg.date}
          </CardDescription>
        </CardHeader>

        {/* Actions bar: Reply, Reply all, Forward (Link to compose); Archive, Delete (confirm modals); More (DropdownMenu). Tooltips on each action. */}
        <div
          aria-label="Message actions"
          className="flex flex-wrap items-center gap-1 border-b border-border px-6 pb-3"
          role="toolbar"
        >
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Button
                asChild={true}
                data-testid="MessageDetail-action-reply"
                size="sm"
                variant="ghost"
              >
                <Link
                  to={`${MAIL_PATHS.compose}?replyTo=${msg.id}`}
                  viewTransition={true}
                >
                  <ArrowBendUpLeftIcon
                    aria-hidden={true}
                    className="size-4 shrink-0"
                  />
                  Reply
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply to sender</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Button
                asChild={true}
                data-testid="MessageDetail-action-reply-all"
                size="sm"
                variant="ghost"
              >
                <Link
                  to={`${MAIL_PATHS.compose}?replyTo=${msg.id}&replyAll=1`}
                  viewTransition={true}
                >
                  <ArrowBendDoubleUpLeftIcon
                    aria-hidden={true}
                    className="size-4 shrink-0"
                  />
                  Reply all
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reply to all</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Button
                asChild={true}
                data-testid="MessageDetail-action-forward"
                size="sm"
                variant="ghost"
              >
                <Link
                  to={`${MAIL_PATHS.compose}?forward=${msg.id}`}
                  viewTransition={true}
                >
                  <PaperPlaneTiltIcon
                    aria-hidden={true}
                    className="size-4 shrink-0"
                  />
                  Forward
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Button
                aria-label="Archive"
                data-testid="MessageDetail-action-archive"
                onClick={handleArchiveClick}
                size="sm"
                variant="ghost"
              >
                <ArchiveIcon aria-hidden={true} className="size-4 shrink-0" />
                Archive
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive this message</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Button
                aria-label="Delete"
                data-testid="MessageDetail-action-delete"
                onClick={handleDeleteClick}
                size="sm"
                variant="ghost"
              >
                <TrashIcon aria-hidden={true} className="size-4 shrink-0" />
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move to trash</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild={true}>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <Button
                    aria-label="More actions"
                    className="size-8"
                    data-testid="MessageDetail-action-more"
                    size="icon"
                    variant="ghost"
                  >
                    <DotsThreeIcon aria-hidden={true} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>More actions</TooltipContent>
              </Tooltip>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={true}>
                Mark as unread
              </DropdownMenuItem>
              <MoveToFolderDropdown
                folders={MOCK_FOLDERS}
                onSelect={(folderId) =>
                  message != null && onMoveToFolder?.(message, folderId)
                }
                triggerLabel="Move to folder"
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={true}>Print</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Confirm modals for archive and delete. */}
        <ConfirmModal
          confirmLabel="Archive"
          description="This message will be moved to your archive. You can find it there later."
          destructive={false}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmArchive}
          open={confirmAction === 'archive'}
          title="Archive message?"
        />
        <ConfirmModal
          confirmLabel="Move to trash"
          description="This message will be moved to trash. You can recover it from trash before it is permanently deleted."
          destructive={true}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmDelete}
          open={confirmAction === 'delete'}
          title="Move to trash?"
        />

        <CardContent className="pt-4">
          {/* Body: plain text with preserved line breaks; safe HTML can be wired when API provides it. */}
          <div className="whitespace-pre-wrap text-sm">{msg.body}</div>

          {/* Attachments placeholder: list names with Badge; wire to download/API when backend exists. */}
          {hasAttachments ? (
            <div
              className="mt-4 border-t border-border pt-4"
              data-testid="MessageDetail-attachments"
            >
              <p className="mb-2 text-xs font-medium text-muted-foreground">
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
