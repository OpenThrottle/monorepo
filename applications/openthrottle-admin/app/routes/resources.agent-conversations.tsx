import type {
  ListAgentConversationsResult,
  LoadAgentConversationMessagesResult,
  MutateAgentConversationResult,
} from '@openthrottle/react-router-chat';
import {
  handleDeleteAgentConversationIntent,
  handleListAgentConversationsIntent,
  handleLoadAgentConversationMessagesIntent,
  handleRenameAgentConversationIntent,
} from '~/global/utils/utils.agents-chat';
import type { Route } from '@/app/routes/+types/resources.agent-conversations';

/** Union of every JSON shape this route's action can return, keyed by intent. */
export type AgentConversationsActionResult =
  | ListAgentConversationsResult
  | LoadAgentConversationMessagesResult
  | MutateAgentConversationResult
  | null;

/**
 * Resource route action for persisted-conversation data ops —
 * `POST /resources/agent-conversations`. Route-independent so the header
 * switcher posts here. Dispatches by `intent`: `list`, `load-messages`,
 * `rename`, `delete` (soft-delete). Auth + validation live in the shared
 * `handle*` helpers.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<AgentConversationsActionResult> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'list') {
    return handleListAgentConversationsIntent(args.request, formData);
  }

  if (intent === 'load-messages') {
    return handleLoadAgentConversationMessagesIntent(args.request, formData);
  }

  if (intent === 'rename') {
    return handleRenameAgentConversationIntent(args.request, formData);
  }

  if (intent === 'delete') {
    return handleDeleteAgentConversationIntent(args.request, formData);
  }

  return null;
};
