import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  Check,
  ExternalLink,
  FolderInput,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import * as React from 'react';

import {
  MENU_ITEM_CLASSES,
  MENU_ITEM_DESTRUCTIVE_CLASSES,
  MENU_TRIGGER_VISIBILITY_CLASSES,
} from '../data/chat-conversation-row.classes';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { CHAT_PANEL_HOVER_CLASSES } from '../data/chat-panel.classes';
import type {
  AgentConversationGroup,
  AgentConversationListItem,
} from '../types';

export interface ChatConversationRowMenuProps {
  /** Keeps the trigger visible (the active row). */
  readonly alwaysVisible: boolean;
  readonly conversation: AgentConversationListItem;
  /** The user's groups; null when the host offers no pinning or groups. */
  readonly groups: readonly AgentConversationGroup[] | null;
  readonly label: string;
  readonly onDelete: () => void;
  readonly onMoveToGroup: (groupId: string | null) => void;
  readonly onNewGroup: () => void;
  readonly onOpen: () => void;
  readonly onRename: () => void;
  readonly onTogglePin: () => void;
}

/**
 * @description A conversation row's `⋯` menu: Rename, Pin / Unpin, Move to
 * group (existing groups, New group…, Remove from group), Open and Delete.
 * Built on shadcn's DropdownMenu rather than `GlobalPopover`, which lives in
 * `react-router-ui-global` — a package that depends on this one.
 */
export const ChatConversationRowMenu = (
  props: ChatConversationRowMenuProps,
): React.ReactElement => {
  const {
    alwaysVisible,
    conversation,
    groups,
    label,
    onDelete,
    onMoveToGroup,
    onNewGroup,
    onOpen,
    onRename,
    onTogglePin,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const hasGrouping = groups != null;
  const pinLabel = conversation.pinned ? copy.unpin : copy.pin;
  const PinIcon = conversation.pinned ? PinOff : Pin;

  // Handlers

  // Markup
  const groupItems = (groups ?? []).map((group) => (
    <DropdownMenuItem
      className={MENU_ITEM_CLASSES}
      key={group.id}
      onSelect={() => onMoveToGroup(group.id)}
    >
      <Check
        aria-hidden={true}
        className={cn(group.id !== conversation.groupId && 'invisible')}
      />
      {group.name}
    </DropdownMenuItem>
  ));

  const groupingMenu = (
    <>
      <DropdownMenuItem className={MENU_ITEM_CLASSES} onSelect={onTogglePin}>
        <PinIcon aria-hidden={true} />
        {pinLabel}
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={MENU_ITEM_CLASSES}>
          <FolderInput aria-hidden={true} />
          {copy.moveToGroup}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {groupItems}
          <DropdownMenuItem className={MENU_ITEM_CLASSES} onSelect={onNewGroup}>
            <FolderPlus aria-hidden={true} />
            {copy.newGroupEllipsis}
          </DropdownMenuItem>
          {conversation.groupId != null && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={MENU_ITEM_CLASSES}
                onSelect={() => onMoveToGroup(null)}
              >
                {copy.removeFromGroup}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
  const groupingItems = hasGrouping ? groupingMenu : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button
          aria-label={`${copy.moreOptionsFor} ${label}`}
          className={cn(
            'text-muted-foreground size-7 shrink-0 pointer-coarse:size-11',
            CHAT_PANEL_HOVER_CLASSES,
            !alwaysVisible && MENU_TRIGGER_VISIBILITY_CLASSES,
          )}
          data-testid={`ChatConversationSidebar-more-${conversation.id}`}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal aria-hidden={true} className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem className={MENU_ITEM_CLASSES} onSelect={onRename}>
          <Pencil aria-hidden={true} />
          {copy.rename}
          <DropdownMenuShortcut>{copy.renameShortcut}</DropdownMenuShortcut>
        </DropdownMenuItem>
        {groupingItems}
        <DropdownMenuItem className={MENU_ITEM_CLASSES} onSelect={onOpen}>
          <ExternalLink aria-hidden={true} />
          {copy.open}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(MENU_ITEM_CLASSES, MENU_ITEM_DESTRUCTIVE_CLASSES)}
          data-testid={`ChatConversationSidebar-delete-${conversation.id}`}
          onSelect={onDelete}
        >
          <Trash2 aria-hidden={true} />
          {copy.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
