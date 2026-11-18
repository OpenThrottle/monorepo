/**
 * @description Test-data factories, published as `@openthrottle/nestjs-repositories/testing`.
 *
 * Kept off the main entry on purpose: every factory imports `@faker-js/faker`, a devDependency.
 * Re-exported from `.` they made the production server load faker at startup, and the image —
 * which installs production dependencies only — crashed with ERR_MODULE_NOT_FOUND.
 */
export type { AgentAccountFactoryData } from '../modules/agent-accounts/agent-accounts.factory.ts';
export { agentAccountFactory } from '../modules/agent-accounts/agent-accounts.factory.ts';
export type {
  AgentConversationFactoryData,
  AgentConversationMessageFactoryData,
} from '../modules/agent-conversations/agent-conversations.factory.ts';
export {
  agentConversationMessagesFactory,
  agentConversationsFactory,
} from '../modules/agent-conversations/agent-conversations.factory.ts';
export type { AgentTokenUsageFactoryData } from '../modules/agent-token-usage/agent-token-usage.factory.ts';
export { agentTokenUsageFactory } from '../modules/agent-token-usage/agent-token-usage.factory.ts';
export type { CustomPromptFactoryData } from '../modules/prompts/custom-prompts.factory.ts';
export { customPromptsFactory } from '../modules/prompts/custom-prompts.factory.ts';
export { usersFactory } from '../modules/users/users.factory.ts';
// Moved to nestjs-repositories-server (OT plan f89ee499): re-exported under the same names.
export {
  planEmbeddingsFactory,
  planOutputStreamFactory,
  plansFactory,
  projectsFactory,
  taskEmbeddingsFactory,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
