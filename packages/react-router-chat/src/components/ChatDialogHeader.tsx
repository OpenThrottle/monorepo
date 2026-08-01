import * as React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { BotIcon, MessageSquarePlus } from 'lucide-react';
import { ChatConversationSheet } from './ChatConversationSheet';
import type { ChatConversationSidebarProps } from './ChatConversationSidebar';

export interface ChatDialogHeaderProps {
  /** Optional conversations switcher rendered as a right-edge sheet. */
  readonly conversationSidebar?: ChatConversationSidebarProps;
  /** Starts a fresh conversation; the control is hidden when absent. */
  readonly onStartNewChat?: () => void;
  readonly title: string;
}

/**
 * @description Shared {@link ChatDialog} title row: bot icon + title, plus the
 * optional conversations switcher and "New chat" control. Rendered inside both
 * the sheet and dialog variants so the header stays identical across them.
 *
 * @public
 */
export const ChatDialogHeader = (
  props: ChatDialogHeaderProps,
): React.ReactElement => {
  const { conversationSidebar, onStartNewChat, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-4">
        <BotIcon
          aria-hidden={true}
          className="text-muted-foreground shrink-0"
        />
        <span className="truncate">{title}</span>
      </span>
      {conversationSidebar != null ? (
        <ChatConversationSheet
          {...conversationSidebar}
          side="right"
          triggerTestId="ChatDialog-conversations-trigger"
        />
      ) : null}
      {onStartNewChat != null ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild={true}>
            <Button
              aria-label="New chat"
              className="shrink-0"
              onClick={onStartNewChat}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MessageSquarePlus aria-hidden={true} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
      ) : null}
    </>
  );
};
