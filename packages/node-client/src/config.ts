/**
 * @description Cortex Postgres connection config from env, for server consumers and MCP tools.
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
