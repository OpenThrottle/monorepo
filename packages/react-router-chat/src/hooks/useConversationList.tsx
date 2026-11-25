import { toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher } from 'react-router';

import { AGENT_CONVERSATIONS_ACTION } from '../data/chat-conversation-actions';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type {
  AgentConversationListItem,
  ListAgentConversationsResult,
  MutateAgentConversationResult,
} from '../types';

/** @public */
export interface UseConversationListOptions {
  /**
   * Whether the list may be fetched. The list action is protected, so a
   * logged-out host passes `false`: no request fires until it turns `true`.
   */
  readonly enabled: boolean;
}

/** @public */
export interface UseConversationListResult {
  readonly conversations: readonly AgentConversationListItem[];
  /**
   * Why the last list request failed (auth, permission, server down), or null.
   * A failed list returns zero rows, so without this the sidebar would read the
   * failure as "No conversations yet".
   */
  readonly errorMessage: string | null;
  /** True while the first page is loading (nothing shown yet). */
  readonly isLoading: boolean;
  /** True while a subsequent page is loading. */
  readonly isLoadingMore: boolean;
  /** Fetch the next page and append it. */
  readonly loadMore: () => void;
  /**
   * Rewrite loaded rows locally, without a request — how
   * {@link useConversationGroups} applies an optimistic pin or move, a server
   * row, or a deleted group's release.
   */
  readonly mapConversations: (
    update: (
      conversation: AgentConversationListItem,
    ) => AgentConversationListItem,
  ) => void;
  /** Reload from the first page (e.g. after a new conversation is created). */
  readonly refresh: () => void;
  /** Optimistically soft-delete a conversation, then persist it. */
  readonly remove: (conversationId: string) => void;
  /** Optimistically rename a conversation, then persist it. */
  readonly rename: (conversationId: string, title: string) => void;
  /** Undo a {@link remove}: re-list the conversation in its slot, then persist it. */
  readonly restore: (conversation: AgentConversationListItem) => void;
  /** Server-side total (drives the sidebar's load-more affordance). */
  readonly totalCount: number;
}

/**
 * @description Owns the conversations-list state for the header switcher /
 * sidebar: paginated fetch + accumulate (dedup by id), optimistic rename,
 * soft-delete and its undo (restore), and a refresh used when a new conversation appears server-side.
 * Posts every op to the route-independent `/resources/agent-conversations`
 * action so the home route and the header switcher — across both apps — share
 * one code path. Nothing is fetched while `enabled` is false.
 * @public
 */
export function useConversationList(
  options: UseConversationListOptions,
): UseConversationListResult {
  const { enabled } = options;

  // Hooks
  const listFetcher = useFetcher<ListAgentConversationsResult>();
  const mutateFetcher = useFetcher<MutateAgentConversationResult>();
  // Restore gets its own fetcher: a quick Undo right after a delete must not
  // abort the delete request still on the same fetcher.
  const restoreFetcher = useFetcher<MutateAgentConversationResult>();
  const [conversations, setConversations] = React.useState<
    AgentConversationListItem[]
  >([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const loadedOnce = React.useRef(false);
  // Id of the conversation whose restore is in flight, so a failed restore
  // rolls back its optimistic re-insert.
  const restoringId = React.useRef<string | null>(null);
  // Latest list for `restore`: a toast's Undo calls the `restore` captured when
  // the row was deleted, whose `conversations` still holds that row.
  const latestConversations = React.useRef(conversations);

  // Setup
  /** Conversations fetched per page (matches the server's default list limit). */
  const pageSize = 20;
  const isFetching = listFetcher.state !== 'idle';
  const isLoading = isFetching && conversations.length === 0;
  const isLoadingMore = isFetching && conversations.length > 0;

  // Handlers
  const fetchPage = (offset: number): void => {
    listFetcher.submit(
      { intent: 'list', limit: String(pageSize), offset: String(offset) },
      // A list read changes nothing a page loader shows, so it must not make
      // React Router re-run every matched loader. Rename and delete below keep
      // the default: they change the conversations a page may list.
      {
        action: AGENT_CONVERSATIONS_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  const loadMore = (): void => {
    fetchPage(conversations.length);
  };

  const mapConversations = (
    update: (
      conversation: AgentConversationListItem,
    ) => AgentConversationListItem,
  ): void => {
    setConversations((previous) => previous.map(update));
  };

  const refresh = (): void => {
    setConversations([]);
    fetchPage(0);
  };

  const rename = (conversationId: string, title: string): void => {
    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return { ...conversation, title };
      }),
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

  const restore = (conversation: AgentConversationListItem): void => {
    const alreadyListed = latestConversations.current.some(
      (row) => row.id === conversation.id,
    );

    if (!alreadyListed) {
      // Newest-activity-first: the first row older than the restored one
      // marks its slot. Compared as parsed times, not strings: the list
      // serializes `updatedAt` as `Date#toString()`, which does not sort.
      setConversations((previous) => {
        if (previous.some((row) => row.id === conversation.id)) {
          return previous;
        }

        const restoredAt = Date.parse(conversation.updatedAt);
        const slot = previous.findIndex(
          (row) => Date.parse(row.updatedAt) < restoredAt,
        );
        const index = slot === -1 ? previous.length : slot;

        return [
          ...previous.slice(0, index),
          conversation,
          ...previous.slice(index),
        ];
      });
      setTotalCount((previous) => previous + 1);
    }

    restoringId.current = conversation.id;
    restoreFetcher.submit(
      { conversationId: conversation.id, intent: 'restore' },
      { action: AGENT_CONVERSATIONS_ACTION, method: 'post' },
    );
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    latestConversations.current = conversations;
  }, [conversations]);

  // Initial load (once), deferred until the host enables it — a logged-out
  // page must fire no request at the protected list action.
  React.useEffect(() => {
    if (!enabled || loadedOnce.current) {
      return;
    }
    loadedOnce.current = true;
    fetchPage(0);
  }, [enabled]);

  // Merge each loaded page into the accumulated list. Append + dedup by id, so
  // a `refresh` (which clears first) replaces, load-more appends, and an
  // optimistic rename already in state survives a later append.
  React.useEffect(() => {
    const data = listFetcher.data;
    if (!data) {
      return;
    }

    setErrorMessage(data.errorMessage ?? null);
    if (data.errorMessage != null) {
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

  // A failed restore: undo the optimistic re-insert and tell the user.
  React.useEffect(() => {
    const data = restoreFetcher.data;
    const failedId = restoringId.current;
    if (!data || failedId == null) {
      return;
    }

    restoringId.current = null;
    if (data.errorMessage == null) {
      return;
    }

    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== failedId),
    );
    setTotalCount((previous) => Math.max(previous - 1, 0));
    toast.error(CHAT_CONVERSATION_SIDEBAR_COPY.restoreFailed, {
      description: data.errorMessage,
    });
  }, [restoreFetcher.data]);

  // 🔌 Short Circuit

  return {
    conversations,
    errorMessage,
    isLoading,
    isLoadingMore,
    loadMore,
    mapConversations,
    refresh,
    remove,
    rename,
    restore,
    totalCount,
  };
}
