/**
 * @description OpenThrottle Postgres connection config from env, for server consumers and MCP tools.
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';

export interface OpenThrottlePostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Returns OpenThrottle Postgres connection string from POSTGRES_URL or POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): OpenThrottlePostgresConfig | undefined {
  try {
    return { connectionString: getPostgresUrl() };
  } catch {
    return undefined;
  }
}
