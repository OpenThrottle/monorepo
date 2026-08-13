import { createAgentConversationsApi } from '@openthrottle/react-router-chat';
import {
  DeleteAgentConversationDocument,
  GetAgentConversationMessagesDocument,
  ListAgentConversationsDocument,
  UpdateAgentConversationTitleDocument,
} from '~/__generated__/graphql';

/**
 * @description Persisted-conversation CRUD for the admin header chat's
 * sidebar/switcher. The logic is single-sourced in
 * `@openthrottle/react-router-chat` ({@link createAgentConversationsApi}); this
 * module only supplies the admin app's generated documents. Admin has no
 * non-streaming MCP-tool-router turn path (that stays developer-only).
 */
const agentConversations = createAgentConversationsApi({
  deleteDocument: DeleteAgentConversationDocument,
  getMessagesDocument: GetAgentConversationMessagesDocument,
  listDocument: ListAgentConversationsDocument,
  updateTitleDocument: UpdateAgentConversationTitleDocument,
});

export const handleDeleteAgentConversationIntent =
  agentConversations.handleDeleteAgentConversationIntent;
export const handleListAgentConversationsIntent =
  agentConversations.handleListAgentConversationsIntent;
export const handleLoadAgentConversationMessagesIntent =
  agentConversations.handleLoadAgentConversationMessagesIntent;
export const handleRenameAgentConversationIntent =
  agentConversations.handleRenameAgentConversationIntent;
