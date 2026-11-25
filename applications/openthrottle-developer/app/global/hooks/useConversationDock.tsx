import type {
  ChatConversationGrouping,
  UseConversationListResult,
} from '@openthrottle/react-router-chat';
import {
  useConversationGroups,
  useConversationList,
} from '@openthrottle/react-router-chat';
import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import type { ChatDockState } from '~/global/utils/chat-dock-cookie';
import { serializeChatDockCookie } from '~/global/utils/chat-dock-cookie';

export interface UseConversationDockOptions {
  /** Whether conversations may be fetched; false while logged out. */
  readonly enabled: boolean;
  /** The dock state the root loader read from the cookie. */
  readonly initialState: ChatDockState;
}

export interface UseConversationDockResult {
  /** The conversation open on the chat route, or null. */
  readonly activeConversationId: string | null;
  readonly grouping: ChatConversationGrouping;
  readonly isOpen: boolean;
  readonly list: UseConversationListResult;
  /** Go to the chat route with a fresh thread. */
  readonly newChat: () => void;
  /** Go to the chat route with this conversation. */
  readonly selectConversation: (conversationId: string) => void;
  readonly toggleOpen: () => void;
}

/**
 * @description State for the docked conversations column shown on every
 * route: the conversation list, pinning and groups, and whether the column and
 * each group are collapsed — persisted in a cookie the root loader reads, so a
 * refresh renders the same layout. Picking a chat navigates to the chat route
 * (`/?conversationId=`); New chat navigates there with `state.newChat`, which
 * the home route answers by clearing its thread. ⌘. / Ctrl+. toggles the column.
 */
export const useConversationDock = (
  options: UseConversationDockOptions,
): UseConversationDockResult => {
  const { enabled, initialState } = options;

  // Hooks
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const list = useConversationList({ enabled });
  const groups = useConversationGroups({
    enabled,
    mapConversations: list.mapConversations,
  });
  const [dockState, setDockState] = React.useState(initialState);
  const refreshedForId = React.useRef<string | null>(null);

  // Setup
  const isChatRoute = pathname === '/';
  const activeConversationId = isChatRoute
    ? searchParams.get('conversationId')
    : null;
  const isActiveListed = list.conversations.some(
    (conversation) => conversation.id === activeConversationId,
  );

  // Handlers
  const toggleOpen = (): void => {
    setDockState((previous) => ({ ...previous, isOpen: !previous.isOpen }));
  };

  const toggleGroupCollapsed = (groupId: string): void => {
    setDockState((previous) => {
      const isCollapsed = previous.collapsedGroupIds.includes(groupId);
      const collapsedGroupIds = isCollapsed
        ? previous.collapsedGroupIds.filter((id) => id !== groupId)
        : [...previous.collapsedGroupIds, groupId];

      return { ...previous, collapsedGroupIds };
    });
  };

  const selectConversation = (conversationId: string): void => {
    navigate(`/?conversationId=${encodeURIComponent(conversationId)}`);
  };

  const newChat = (): void => {
    navigate('/', { state: { newChat: Date.now() } });
  };

  const grouping: ChatConversationGrouping = {
    collapsedGroupIds: dockState.collapsedGroupIds,
    groups: groups.groups,
    onCreateGroup: groups.createGroup,
    onDeleteGroup: groups.deleteGroup,
    onMoveToGroup: groups.moveToGroup,
    onRenameGroup: groups.renameGroup,
    onSetPinned: groups.setPinned,
    onToggleGroupCollapsed: toggleGroupCollapsed,
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    document.cookie = serializeChatDockCookie(dockState);
  }, [dockState]);

  // A conversation the chat route just created is not in the dock's list yet:
  // reload the list once for it.
  React.useEffect(() => {
    const shouldRefresh =
      activeConversationId != null &&
      !isActiveListed &&
      !list.isLoading &&
      refreshedForId.current !== activeConversationId;
    if (shouldRefresh) {
      refreshedForId.current = activeConversationId;
      list.refresh();
    }
  }, [activeConversationId, isActiveListed, list.isLoading]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === '.') {
        event.preventDefault();
        setDockState((previous) => ({ ...previous, isOpen: !previous.isOpen }));
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 🔌 Short Circuit

  return {
    activeConversationId,
    grouping,
    isOpen: dockState.isOpen,
    list,
    newChat,
    selectConversation,
    toggleOpen,
  };
};
