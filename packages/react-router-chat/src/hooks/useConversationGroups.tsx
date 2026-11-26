import { toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher } from 'react-router';

import {
  AGENT_CONVERSATION_GROUP_INTENTS,
  AGENT_CONVERSATIONS_ACTION,
} from '../data/chat-conversation-actions';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type {
  AgentConversationGroup,
  AgentConversationListItem,
  ListAgentConversationGroupsResult,
  MutateAgentConversationGroupResult,
  MutateAgentConversationResult,
} from '../types';

/** @public */
export interface UseConversationGroupsOptions {
  /** Whether groups may be fetched; a logged-out host passes `false`. */
  readonly enabled: boolean;
  /** {@link useConversationList}'s local updater, so pins and moves show at once. */
  readonly mapConversations: (
    update: (
      conversation: AgentConversationListItem,
    ) => AgentConversationListItem,
  ) => void;
}

/** @public */
export interface UseConversationGroupsResult {
  /** Create a group; with a conversation id, also move that conversation into it. */
  readonly createGroup: (name: string, conversationId: string | null) => void;
  /** Delete a group; its conversations return to the date sections. */
  readonly deleteGroup: (groupId: string) => void;
  /** The user's groups in `sortOrder`. */
  readonly groups: readonly AgentConversationGroup[];
  /** Move a conversation into a group (which unpins it), or out with `null`. */
  readonly moveToGroup: (
    conversationId: string,
    groupId: string | null,
  ) => void;
  readonly renameGroup: (groupId: string, name: string) => void;
  /** Reorder the groups: every group id once, top to bottom. */
  readonly reorderGroups: (groupIds: readonly string[]) => void;
  readonly setPinned: (conversationId: string, pinned: boolean) => void;
}

/**
 * @description Pinning and user-defined groups for the conversations sidebar.
 * Owns the group list; applies conversation changes through
 * {@link useConversationList}'s `mapConversations` so both hooks show one
 * consistent list. Pins, moves, renames, reorders and deletes are optimistic (a
 * failed pin, move or reorder puts things back); a create
 * appears when the server returns the new group's id. Failures toast.
 * @public
 */
export function useConversationGroups(
  options: UseConversationGroupsOptions,
): UseConversationGroupsResult {
  const { enabled, mapConversations } = options;

  // Hooks
  const listFetcher = useFetcher<ListAgentConversationGroupsResult>();
  const organizeFetcher = useFetcher<MutateAgentConversationResult>();
  const createFetcher = useFetcher<MutateAgentConversationGroupResult>();
  const groupFetcher = useFetcher<MutateAgentConversationGroupResult>();
  const reorderFetcher = useFetcher<ListAgentConversationGroupsResult>();
  const [groups, setGroups] = React.useState<AgentConversationGroup[]>([]);
  const loadedOnce = React.useRef(false);
  // The row as it was before the in-flight pin or move, so a failure can put
  // it back. One slot: pins and moves share a fetcher, so a newer submit
  // replaces (aborts) the older one.
  const organizeRollback = React.useRef<AgentConversationListItem | null>(null);
  // The group order before the in-flight reorder, for the same reason.
  const reorderRollback = React.useRef<AgentConversationGroup[] | null>(null);

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const intents = AGENT_CONVERSATION_GROUP_INTENTS;
  const submitOptions = {
    action: AGENT_CONVERSATIONS_ACTION,
    method: 'post',
  } as const;

  // Handlers
  const replaceConversation = (row: AgentConversationListItem): void => {
    mapConversations((conversation) => {
      return conversation.id === row.id ? row : conversation;
    });
  };

  const setPinned = (conversationId: string, pinned: boolean): void => {
    organizeRollback.current = null;
    mapConversations((conversation) => {
      if (conversation.id !== conversationId) {
        return conversation;
      }
      organizeRollback.current = conversation;

      return { ...conversation, pinned };
    });
    organizeFetcher.submit(
      { conversationId, intent: intents.SET_PINNED, pinned: String(pinned) },
      submitOptions,
    );
  };

  const moveToGroup = (
    conversationId: string,
    groupId: string | null,
  ): void => {
    organizeRollback.current = null;
    mapConversations((conversation) => {
      if (conversation.id !== conversationId) {
        return conversation;
      }
      organizeRollback.current = conversation;
      const pinned = groupId == null ? conversation.pinned : false;

      return { ...conversation, groupId, pinned };
    });
    organizeFetcher.submit(
      { conversationId, groupId: groupId ?? '', intent: intents.MOVE_TO_GROUP },
      submitOptions,
    );
  };

  const createGroup = (name: string, conversationId: string | null): void => {
    createFetcher.submit(
      {
        conversationId: conversationId ?? '',
        intent: intents.CREATE_GROUP,
        name,
      },
      submitOptions,
    );
  };

  const renameGroup = (groupId: string, name: string): void => {
    setGroups((previous) =>
      previous.map((group) =>
        group.id === groupId ? { ...group, name } : group,
      ),
    );
    groupFetcher.submit(
      { groupId, intent: intents.RENAME_GROUP, name },
      submitOptions,
    );
  };

  const reorderGroups = (groupIds: readonly string[]): void => {
    const byId = new Map(groups.map((group) => [group.id, group]));
    reorderRollback.current = groups;
    setGroups(
      groupIds.flatMap((id, index) => {
        const group = byId.get(id);
        return group == null ? [] : [{ ...group, sortOrder: index }];
      }),
    );
    reorderFetcher.submit(
      { groupIds: JSON.stringify(groupIds), intent: intents.REORDER_GROUPS },
      submitOptions,
    );
  };

  const deleteGroup = (groupId: string): void => {
    setGroups((previous) => previous.filter((group) => group.id !== groupId));
    mapConversations((conversation) => {
      return conversation.groupId === groupId
        ? { ...conversation, groupId: null }
        : conversation;
    });
    groupFetcher.submit(
      { groupId, intent: intents.DELETE_GROUP },
      submitOptions,
    );
    toast(copy.groupDeletedToast);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!enabled || loadedOnce.current) {
      return;
    }
    loadedOnce.current = true;
    listFetcher.submit(
      { intent: intents.LIST_GROUPS },
      {
        ...submitOptions,
        defaultShouldRevalidate: false,
      },
    );
  }, [enabled]);

  React.useEffect(() => {
    const data = listFetcher.data;
    if (data == null || data.errorMessage != null) {
      return;
    }
    setGroups([...data.groups]);
  }, [listFetcher.data]);

  React.useEffect(() => {
    const data = organizeFetcher.data;
    if (data == null) {
      return;
    }
    const previous = organizeRollback.current;
    organizeRollback.current = null;
    if (data.errorMessage != null) {
      if (previous != null) {
        replaceConversation(previous);
      }
      toast.error(copy.organizeFailed, { description: data.errorMessage });
      return;
    }
    if (data.conversation != null) {
      replaceConversation(data.conversation);
    }
  }, [organizeFetcher.data]);

  React.useEffect(() => {
    const data = createFetcher.data;
    if (data == null) {
      return;
    }
    if (data.errorMessage != null || data.group == null) {
      toast.error(copy.groupUpdateFailed, {
        description: data.errorMessage ?? undefined,
      });
      return;
    }
    const created = data.group;
    setGroups((previous) => {
      const isListed = previous.some((group) => group.id === created.id);
      return isListed ? previous : [...previous, created];
    });
    if (data.conversation != null) {
      replaceConversation(data.conversation);
    }
  }, [createFetcher.data]);

  React.useEffect(() => {
    const data = reorderFetcher.data;
    if (data == null) {
      return;
    }
    const previous = reorderRollback.current;
    reorderRollback.current = null;
    if (data.errorMessage != null) {
      if (previous != null) {
        setGroups(previous);
      }
      toast.error(copy.groupUpdateFailed, { description: data.errorMessage });
      return;
    }
    setGroups([...data.groups]);
  }, [reorderFetcher.data]);

  React.useEffect(() => {
    const data = groupFetcher.data;
    if (data?.errorMessage != null) {
      toast.error(copy.groupUpdateFailed, { description: data.errorMessage });
    }
  }, [groupFetcher.data]);

  // 🔌 Short Circuit

  return {
    createGroup,
    deleteGroup,
    groups,
    moveToGroup,
    renameGroup,
    reorderGroups,
    setPinned,
  };
}
