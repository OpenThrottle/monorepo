/**
 * @description Shared shapes for the agent-CLI install/update streaming feature. The publish
 * envelope key MUST equal the subscription resolver field name so @nestjs/graphql can resolve
 * agentSetupChunkAdded (mirrors conversationStreamChunkAdded).
 */

/** Subscription field name; used as the PubSub publish envelope key. */
export const AGENT_SETUP_CHUNK_FIELD = 'agentSetupChunkAdded' as const;
/** Env var gating server-side install/update. Default-off; enabled only for true/1/yes. */
export const AGENT_CLI_INSTALL_ENABLED_ENV = 'OT_AGENT_CLI_INSTALL_ENABLED';
