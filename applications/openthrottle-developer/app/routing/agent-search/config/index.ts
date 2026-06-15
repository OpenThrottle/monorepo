/**
 * @description Default and shared settings for the agent-assets search route and API.
 */

/**
 * @publicApi
 * Default/maximum number of asset chunks to request. The server clamps to 50; we request the
 * max so per-tab counts are stable across the all/skills/rules/personas tabs from one query.
 */
export const AGENT_SEARCH_LIMIT = 50;

/** Base path for the agent-assets search route (used by forms and tabs). */
export const AGENT_SEARCH_BASE_PATH = '/agent-search';
