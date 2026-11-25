import { Button } from '@openthrottle/react-router-shadcn';
import { FolderPlus, MessageSquarePlus } from 'lucide-react';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';

export interface ChatConversationSidebarHeaderProps {
  /** Extra controls after New chat (e.g. the docked column's collapse button). */
  readonly end: React.ReactNode;
  readonly onNewChat: () => void;
  /** Starts naming a new group; null when the host offers no groups. */
  readonly onNewGroup: (() => void) | null;
}

/**
 * @description {@link ChatConversationSidebar}'s header row: the title, a New
 * group button when groups are on, New chat, and any host controls.
 */
export const ChatConversationSidebarHeader = (
  props: ChatConversationSidebarHeaderProps,
): React.ReactElement => {
  const { end, onNewChat, onNewGroup } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;

  // Handlers

  // Markup
  const newGroupControl = (
    <Button
      aria-label={copy.newGroup}
      data-testid="ChatConversationSidebar-new-group"
      onClick={onNewGroup ?? undefined}
      size="icon"
      title={copy.newGroup}
      type="button"
      variant="ghost"
    >
      <FolderPlus className="size-4" />
    </Button>
  );
  const newGroupButton = onNewGroup ? newGroupControl : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {copy.title}
      </span>
      <div className="flex items-center">
        {newGroupButton}
        <Button
          aria-label={copy.newChat}
          data-testid="ChatConversationSidebar-new-chat"
          onClick={onNewChat}
          size="sm"
          type="button"
          variant="ghost"
        >
          <MessageSquarePlus className="size-4" />
          {copy.newChat}
        </Button>
        {end}
      </div>
    </div>
  );
};
