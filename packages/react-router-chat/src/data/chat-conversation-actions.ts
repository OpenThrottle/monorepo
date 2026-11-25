/** Route-independent action both the home route and the header chat post to. @public */
export const CONVERSATION_STREAM_ACTION = '/resources/conversation-stream';

/** Route-independent action for persisted-conversation data ops (restore, list, …). @public */
export const AGENT_CONVERSATIONS_ACTION = '/resources/agent-conversations';

/**
 * Intents for pinning and user-defined groups, posted to
 * {@link AGENT_CONVERSATIONS_ACTION} alongside `list` / `rename` / `delete` /
 * `restore`. @public
 */
export const AGENT_CONVERSATION_GROUP_INTENTS = {
  CREATE_GROUP: 'create-group',
  DELETE_GROUP: 'delete-group',
  LIST_GROUPS: 'list-groups',
  MOVE_TO_GROUP: 'move-to-group',
  RENAME_GROUP: 'rename-group',
  SET_PINNED: 'set-pinned',
} as const;

/** @public */
export type AgentConversationGroupIntentsKey =
  keyof typeof AGENT_CONVERSATION_GROUP_INTENTS;

/** @public */
export type AgentConversationGroupIntentsValue =
  (typeof AGENT_CONVERSATION_GROUP_INTENTS)[AgentConversationGroupIntentsKey];
