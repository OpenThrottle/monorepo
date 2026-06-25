/**
 * @description Postgres connection config + default GitHub user from env, for the MCP server tools.
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Returns Cortex Postgres connection string from POSTGRES_URL or POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): CortexPostgresConfig | undefined {
  try {
    return { connectionString: getPostgresUrl() };
  } catch {
    return undefined;
  }
}

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
