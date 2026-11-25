/**
 * @description Producer ids stored in `agent_token_usage.source` (free text in the database,
 * like skill_usage_events.source). `CHAT` is OpenThrottle's own chat path
 * (ConversationStreamService); `CLAUDE_CODE` is the Claude Code hook ingest.
 * @public
 */
export const AGENT_TOKEN_USAGE_SOURCES = {
  CHAT: 'openthrottle-chat',
  CLAUDE_CODE: 'claude-code',
} as const;

export type AgentTokenUsageSourcesKey = keyof typeof AGENT_TOKEN_USAGE_SOURCES;
export type AgentTokenUsageSourcesValue =
  (typeof AGENT_TOKEN_USAGE_SOURCES)[AgentTokenUsageSourcesKey];
