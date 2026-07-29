import * as React from 'react';
import { useFetcher } from 'react-router';
import type {
  AgentConversationListItem,
  ListAgentConversationsResult,
  MutateAgentConversationResult,
} from '@openthrottle/react-router-chat';
import { AGENT_CONVERSATIONS_ACTION } from '~/routing/home/hooks/useAgenticChatTurn';

/** Conversations fetched per page (matches the server's default list limit). */
const PAGE_SIZE = 20;

export interface UseConversationListResult {
  readonly conversations: readonly AgentConversationListItem[];
  /** True while the first page is loading (nothing shown yet). */
  readonly isLoading: boolean;
  /** True while a subsequent page is loading. */
  readonly isLoadingMore: boolean;
  /** Fetch the next page and append it. */
  readonly loadMore: () => void;
  /** Reload from the first page (e.g. after a new conversation is created). */
  readonly refresh: () => void;
  /** Optimistically soft-delete a conversation, then persist it. */
  readonly remove: (conversationId: string) => void;
  /** Optimistically rename a conversation, then persist it. */
  readonly rename: (conversationId: string, title: string) => void;
  /** Server-side total (drives the sidebar's load-more affordance). */
  readonly totalCount: number;
}

/**
 * @description Owns the conversations-list state for the sidebar/switcher:
 * paginated fetch + accumulate (dedup by id), optimistic rename + soft-delete,
 * and a refresh used when a new conversation appears server-side. Posts every op
 * to the route-independent `/resources/agent-conversations` action so the home
 * route and the header switcher share one code path.
 */
export function useConversationList(): UseConversationListResult {
  // Hooks
  const listFetcher = useFetcher<ListAgentConversationsResult>();
  const mutateFetcher = useFetcher<MutateAgentConversationResult>();
  const [conversations, setConversations] = React.useState<
    AgentConversationListItem[]
  >([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const loadedOnce = React.useRef(false);

  // Setup
  const isFetching = listFetcher.state !== 'idle';
  const isLoading = isFetching && conversations.length === 0;
  const isLoadingMore = isFetching && conversations.length > 0;

  // Handlers
  const fetchPage = (offset: number): void => {
    listFetcher.submit(
      { intent: 'list', limit: String(PAGE_SIZE), offset: String(offset) },
      { action: AGENT_CONVERSATIONS_ACTION, method: 'post' },
    );
  };

  const loadMore = (): void => {
    fetchPage(conversations.length);
  };

  const refresh = (): void => {
    setConversations([]);
    fetchPage(0);
  };

  const rename = (conversationId: string, title: string): void => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title }
          : conversation,
      ),
    );
    mutateFetcher.submit(
      { conversationId, intent: 'rename', title },
      { action: AGENT_CONVERSATIONS_ACTION, method: 'post' },
    );
  };

  const remove = (conversationId: string): void => {
    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== conversationId),
    );
    setTotalCount((previous) => Math.max(previous - 1, 0));
    mutateFetcher.submit(
      { conversationId, intent: 'delete' },
      { action: AGENT_CONVERSATIONS_ACTION, method: 'post' },
    );
  };

  // Life Cycle
  // Initial load (once).
  React.useEffect(() => {
    if (loadedOnce.current) {
      return;
    }
    loadedOnce.current = true;
    fetchPage(0);
  }, []);

  // Merge each loaded page into the accumulated list. Append + dedup by id, so
  // a `refresh` (which clears first) replaces, load-more appends, and an
  // optimistic rename already in state survives a later append.
  React.useEffect(() => {
    const data = listFetcher.data;
    if (!data) {
      return;
    }

    setTotalCount(data.totalCount);
    setConversations((previous) => {
      const seen = new Set(previous.map((conversation) => conversation.id));
      const merged = [...previous];
      for (const conversation of data.conversations) {
        if (!seen.has(conversation.id)) {
          merged.push(conversation);
          seen.add(conversation.id);
        }
      }
      return merged;
    });
  }, [listFetcher.data]);

  return {
    conversations,
    isLoading,
    isLoadingMore,
    loadMore,
    refresh,
    remove,
    rename,
    totalCount,
  };
}
