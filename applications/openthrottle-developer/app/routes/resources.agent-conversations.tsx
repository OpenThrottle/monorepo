import type {
  ListAgentConversationGroupsResult,
  ListAgentConversationsResult,
  LoadAgentConversationMessagesResult,
  MutateAgentConversationGroupResult,
  MutateAgentConversationResult,
} from '@openthrottle/react-router-chat';
import { AGENT_CONVERSATION_GROUP_INTENTS } from '@openthrottle/react-router-chat';

import type { Route } from '@/app/routes/+types/resources.agent-conversations';
import {
  agentConversationGroups,
  handleDeleteAgentConversationIntent,
  handleListAgentConversationsIntent,
  handleLoadAgentConversationMessagesIntent,
  handleRenameAgentConversationIntent,
  handleRestoreAgentConversationIntent,
} from '~/global/utils/utils.agents-chat';

/** Union of every JSON shape this route's action can return, keyed by intent. */
export type AgentConversationsActionResult =
  | ListAgentConversationGroupsResult
  | ListAgentConversationsResult
  | LoadAgentConversationMessagesResult
  | MutateAgentConversationGroupResult
  | MutateAgentConversationResult
  | null;

/**
 * Resource route action for persisted-conversation data ops —
 * `POST /resources/agent-conversations`. Route-independent so the docked
 * conversations column, the home route and the header switcher all post here
 * (a root action is not reachable from a leaf). Dispatches by `intent`:
 * `list` (paginated), `load-messages` (restore a thread), `rename`, `delete`
 * (soft-delete), `restore` (undo a soft-delete), plus the pin and group intents
 * in {@link AGENT_CONVERSATION_GROUP_INTENTS}. All auth + validation is handled
 * by the shared `handle*` helpers in utils.agents-chat.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentConversationsActionResult> => {
  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'list') {
    return handleListAgentConversationsIntent(request, formData);
  }

  if (intent === 'load-messages') {
    return handleLoadAgentConversationMessagesIntent(request, formData);
  }

  if (intent === 'rename') {
    return handleRenameAgentConversationIntent(request, formData);
  }

  if (intent === 'delete') {
    return handleDeleteAgentConversationIntent(request, formData);
  }

  if (intent === 'restore') {
    return handleRestoreAgentConversationIntent(request, formData);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.LIST_GROUPS) {
    return agentConversationGroups.handleListGroupsIntent(request);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.SET_PINNED) {
    return agentConversationGroups.handleSetPinnedIntent(request, formData);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.MOVE_TO_GROUP) {
    return agentConversationGroups.handleMoveToGroupIntent(request, formData);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.CREATE_GROUP) {
    return agentConversationGroups.handleCreateGroupIntent(request, formData);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.RENAME_GROUP) {
    return agentConversationGroups.handleRenameGroupIntent(request, formData);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.REORDER_GROUPS) {
    return agentConversationGroups.handleReorderGroupsIntent(request, formData);
  }

  if (intent === AGENT_CONVERSATION_GROUP_INTENTS.DELETE_GROUP) {
    return agentConversationGroups.handleDeleteGroupIntent(request, formData);
  }

  return null;
};
