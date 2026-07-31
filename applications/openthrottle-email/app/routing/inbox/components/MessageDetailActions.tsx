import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { ArrowBendDoubleUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowBendDoubleUpLeft';
import { ArrowBendUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowBendUpLeft';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Link } from 'react-router';
import { MoveToFolderDropdown } from '~/global/components/MoveToFolderDropdown';
import { MAIL_PATHS } from '~/global/data/data.navigation';
import { MOCK_FOLDERS } from '~/global/data/mock.mail';
import type { MailFolderId, MailMessageDetail } from '~/types/mail';

export interface MessageDetailActionsProps {
  /** The (non-null) message the actions operate on. */
  readonly message: MailMessageDetail;
  /** Opens the archive confirm modal. */
  readonly onArchiveClick: () => void;
  /** Opens the delete confirm modal. */
  readonly onDeleteClick: () => void;
  /** Move message to folder; wire to move-message API. */
  readonly onMoveToFolder?: (
    message: MailMessageDetail,
    folderId: MailFolderId,
  ) => void;
}

/**
 * @description Actions bar for the {@link MessageDetail} reading pane: Reply,
 * Reply all, Forward (Links to compose), Archive, Delete (confirm modals in
 * the parent), and More (DropdownMenu with Move to folder). Tooltips on each
 * action.
 */
export const MessageDetailActions = (
  props: MessageDetailActionsProps,
): React.ReactElement => {
  const { message, onArchiveClick, onDeleteClick, onMoveToFolder } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-label="Message actions"
      className="border-border flex flex-wrap items-center gap-1 border-b px-6 pb-3"
      data-testid="MessageDetailActions"
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
              to={`${MAIL_PATHS.compose}?replyTo=${message.id}`}
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
              to={`${MAIL_PATHS.compose}?replyTo=${message.id}&replyAll=1`}
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
              to={`${MAIL_PATHS.compose}?forward=${message.id}`}
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
            onClick={onArchiveClick}
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
            onClick={onDeleteClick}
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
          <DropdownMenuItem disabled={true}>Mark as unread</DropdownMenuItem>
          <MoveToFolderDropdown
            folders={MOCK_FOLDERS}
            onSelect={(folderId) => onMoveToFolder?.(message, folderId)}
            triggerLabel="Move to folder"
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={true}>Print</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
