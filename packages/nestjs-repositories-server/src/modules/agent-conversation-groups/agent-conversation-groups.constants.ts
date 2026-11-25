/**
 * @description Longest allowed `agent_conversation_groups.name`, after trimming (enforced by
 * the server, not the database).
 * @public
 */
export const AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH = 80;

/**
 * @description Gap between `sort_order` values: a new group lands this far past the user's
 * current last group.
 * @public
 */
export const AGENT_CONVERSATION_GROUP_SORT_ORDER_STEP = 1000;
