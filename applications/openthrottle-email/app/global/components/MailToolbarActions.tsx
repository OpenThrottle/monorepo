import * as React from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ArchiveIcon } from '@phosphor-icons/react/dist/ssr/Archive';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { PencilSimpleLineIcon } from '@phosphor-icons/react/dist/ssr/PencilSimpleLine';
import { QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Link } from 'react-router';
import { MAIL_PATHS } from '~/global/data/data.navigation';

export interface MailToolbarActionsProps {}

/**
 * @description Action cluster for {@link MailToolbar}: Compose link, disabled
 * Refresh/Archive/Delete placeholders, and the Help popover with quick tips.
 */
export const MailToolbarActions = (
  _props: MailToolbarActionsProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      data-testid="MailToolbarActions"
    >
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button asChild={true} variant="default">
            <Link to={MAIL_PATHS.compose} viewTransition={true}>
              <PencilSimpleLineIcon aria-hidden={true} className="size-4" />
              Compose
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>New message</TooltipContent>
      </Tooltip>
      {/* Refresh/Archive/Delete are disabled until the mail API is wired; tooltips flag them as upcoming so they don't read as broken no-ops. */}
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="Refresh"
            disabled={true}
            size="icon"
            variant="outline"
          >
            <ArrowsClockwiseIcon aria-hidden={true} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh (coming soon)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="Archive"
            disabled={true}
            size="icon"
            variant="outline"
          >
            <ArchiveIcon aria-hidden={true} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Archive selected (coming soon)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="Delete"
            disabled={true}
            size="icon"
            variant="outline"
          >
            <TrashIcon aria-hidden={true} className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete selected (coming soon)</TooltipContent>
      </Tooltip>
      <Popover>
        <PopoverTrigger asChild={true}>
          <Button
            aria-label="Help"
            data-testid="MailToolbar-help"
            size="icon"
            variant="ghost"
          >
            <QuestionIcon aria-hidden={true} className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <p className="text-sm font-medium">Quick tips</p>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Use search to find messages</li>
            <li>Select rows for bulk actions</li>
            <li>Archive or delete from the reading pane</li>
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
};
