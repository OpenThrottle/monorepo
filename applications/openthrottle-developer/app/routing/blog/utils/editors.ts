import { BLOG_AGENT_EDITORS } from '~/routing/blog/data/data.agent-editors';

/**
 * @description True when `lastEditedBy` names an agent (service account) rather
 * than a person.
 *
 * Heuristic, and deliberately conservative: the API exposes only a name string,
 * never an actor type. Agent writes arrive as a service-account name (the
 * OpenThrottle MCP writes as `openthrottle-mcp`), while people arrive as a
 * GitHub username, display name or email. So a value is an agent only when it
 * has no `@` (never an email) AND matches the known service-account list in
 * {@link BLOG_AGENT_EDITORS}, case-insensitively. An unknown service account
 * therefore renders as a plain name until it is added to that list.
 */
export const isAgentEditor = (lastEditedBy: string | null): boolean => {
  if (lastEditedBy === null || lastEditedBy.includes('@')) {
    return false;
  }

  const needle = lastEditedBy.trim().toLowerCase();

  return BLOG_AGENT_EDITORS.some((name) => name === needle);
};
