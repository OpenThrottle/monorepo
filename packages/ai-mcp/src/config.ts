/**
 * @description Default GitHub user + actor resolution from env, for the MCP server tools.
 * Postgres connection config now lives in @openthrottle/node-client and is re-exported here for
 * the MCP tools that still import it from this module.
 */

export { getPostgresConfig } from '@openthrottle/node-client';
export type { CortexPostgresConfig } from '@openthrottle/node-client';

/**
 * @description Returns the canonical GitHub username for author/assignee when set.
 * Used to enforce GitHub username (not display name) for plan and task author/assignee.
 * Reads GITHUB_USER (trimmed).
 */
export function getDefaultGitHubUser(): string | undefined {
  const username = process.env.GITHUB_USER?.trim() ?? '';

  return username === '' ? undefined : username;
}

/**
 * @description Resolves an author/assignee value with a single, uniform precedence rule for every
 * plan/task tool (create_plan, update_plan, create_task, create_tasks, update_task):
 *
 * 1. When GITHUB_USER (defaultGh) is set, it always wins — enforcing the canonical GitHub username
 *    over any caller-supplied display name.
 * 2. Otherwise the caller-supplied value is used, falling back to `null` when omitted.
 *
 * This describes the value to write for a field that IS being written. On updates, callers should
 * only invoke this for fields the caller actually supplied (so absent fields stay untouched).
 *
 * @param input The caller-supplied actor value (may be undefined or null).
 * @param defaultGh The GITHUB_USER override, or undefined when unset.
 */
export function resolveActor(
  input: string | null | undefined,
  defaultGh: string | undefined,
): string | null {
  return defaultGh ?? input ?? null;
}
