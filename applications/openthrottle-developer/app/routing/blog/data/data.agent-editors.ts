/**
 * @description Service-account names that author blog posts as agents, lower
 * case. `lastEditedBy` is a free-form name, so this list is the only way the UI
 * can tell an agent draft from a person's edit; see `isAgentEditor` for the
 * heuristic. Add a name here when a new service account starts writing posts.
 */
export const BLOG_AGENT_EDITORS: readonly string[] = ['openthrottle-mcp'];
