import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Folder,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import * as React from 'react';

import {
  MENU_ITEM_CLASSES,
  MENU_ITEM_DESTRUCTIVE_CLASSES,
  MENU_TRIGGER_VISIBILITY_CLASSES,
} from '../data/chat-conversation-row.classes';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type { AgentConversationGroup } from '../types';

export interface ChatConversationGroupHeaderProps {
  readonly count: number;
  readonly group: AgentConversationGroup;
  readonly isCollapsed: boolean;
  readonly onDelete: () => void;
  /** Null at the bottom; both null hides the move items (a lone group). */
  readonly onMoveDown: (() => void) | null;
  /** Null at the top. */
  readonly onMoveUp: (() => void) | null;
  readonly onStartRename: () => void;
  readonly onToggleCollapsed: () => void;
}

/**
 * @description A user-defined group's header in {@link ChatConversationSidebar}:
 * click to collapse or expand, double-click (or F2) to rename, and a `⋯` menu
 * with Rename, Move up / Move down and Delete group. Deleting keeps the group's
 * chats.
 */
export const ChatConversationGroupHeader = (
  props: ChatConversationGroupHeaderProps,
): React.ReactElement => {
  const {
    count,
    group,
    isCollapsed,
    onDelete,
    onMoveDown,
    onMoveUp,
    onStartRename,
    onToggleCollapsed,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const collapseLabel = isCollapsed ? copy.expandGroup : copy.collapseGroup;
  const isMovable = onMoveUp != null || onMoveDown != null;

  // Handlers
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key === 'F2') {
      event.preventDefault();
      onStartRename();
    }
  };

  // Markup
  const moveItems = (
    <>
      <DropdownMenuItem
        className={MENU_ITEM_CLASSES}
        disabled={onMoveUp == null}
        onSelect={() => onMoveUp?.()}
      >
        <ArrowUp aria-hidden={true} />
        {copy.moveGroupUp}
      </DropdownMenuItem>
      <DropdownMenuItem
        className={MENU_ITEM_CLASSES}
        disabled={onMoveDown == null}
        onSelect={() => onMoveDown?.()}
      >
        <ArrowDown aria-hidden={true} />
        {copy.moveGroupDown}
      </DropdownMenuItem>
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="group/row hover:bg-accent/40 mx-1 mt-2 flex items-center gap-1 rounded-md pr-1"
      data-testid={`ChatConversationSidebar-group-${group.id}`}
    >
      <button
        aria-expanded={!isCollapsed}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-1.5 py-1.5 text-left text-xs font-semibold"
        onClick={onToggleCollapsed}
        onDoubleClick={onStartRename}
        onKeyDown={handleKeyDown}
        title={copy.renameHint}
        type="button"
      >
        <ChevronDown
          aria-hidden={true}
          className={cn(
            'size-3.5 shrink-0 transition-transform',
            isCollapsed && '-rotate-90',
          )}
        />
        <Folder
          aria-hidden={true}
          className="text-muted-foreground size-3.5 shrink-0"
        />
        <span className="truncate">{group.name}</span>
        <span className="text-muted-foreground font-normal">{count}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          <Button
            aria-label={`${copy.moreOptionsForGroup} ${group.name}`}
            className={cn(
              'text-muted-foreground size-7 shrink-0',
              MENU_TRIGGER_VISIBILITY_CLASSES,
            )}
            data-testid={`ChatConversationSidebar-group-more-${group.id}`}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal aria-hidden={true} className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            className={MENU_ITEM_CLASSES}
            onSelect={onStartRename}
          >
            <Pencil aria-hidden={true} />
            {copy.renameGroup}
            <DropdownMenuShortcut>{copy.renameShortcut}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={MENU_ITEM_CLASSES}
            onSelect={onToggleCollapsed}
          >
            <ChevronDown aria-hidden={true} />
            {collapseLabel}
          </DropdownMenuItem>
          {isMovable ? moveItems : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={cn(MENU_ITEM_CLASSES, MENU_ITEM_DESTRUCTIVE_CLASSES)}
            onSelect={onDelete}
          >
            <Trash2 aria-hidden={true} />
            {copy.deleteGroup}
          </DropdownMenuItem>
          <DropdownMenuLabel className="text-muted-foreground pt-0 text-xs font-normal">
            {copy.deleteGroupHint}
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
