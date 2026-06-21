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
export function getPostgresConfig(): CortexPostgresConfig {
  return { connectionString: getPostgresUrl() };
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
