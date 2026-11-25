import { AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH } from '../agent-conversation-groups.constants.ts';
import type { AgentConversationGroupNameResult } from '../agent-conversation-groups.types.ts';

/**
 * @description Trims a group name and checks it is non-empty and at most
 * {@link AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH} characters. Returns a result rather than
 * throwing, so the GraphQL layer can turn a refusal into a validation error.
 * @public
 */
export function normalizeAgentConversationGroupName(
  rawName: string,
): AgentConversationGroupNameResult {
  const name = rawName.trim();

  if (name === '') {
    return { message: `Group name must not be empty`, ok: false };
  }

  if (name.length > AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH) {
    return {
      message: `Group name must be at most ${AGENT_CONVERSATION_GROUP_NAME_MAX_LENGTH} characters`,
      ok: false,
    };
  }

  return { name, ok: true };
}
