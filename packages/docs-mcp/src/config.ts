/**
 * @description Builds Cortex Postgres connection config from env (CORTEX_POSTGRES_URL, CORTEX_POSTGRES_*, or DOCS_MCP_*).
 */

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Returns Cortex Postgres connection string from CORTEX_POSTGRES_URL, CORTEX_POSTGRES_*, or DOCS_MCP_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getCortexPostgresConfig(): CortexPostgresConfig | undefined {
  const url = process.env.POSTGRES_URL?.trim();

  if (url) {
    return { connectionString: url };
  }

  const db = process.env.POSTGRES_DB ?? 'cortex';
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const password = process.env.POSTGRES_PASSWORD ?? 'cortex_password';
  const user = process.env.POSTGRES_USER ?? 'cortex_user';
  const port = process.env.POSTGRES_PORT
    ? Number(process.env.POSTGRES_PORT)
    : '6010';

  const encodedPassword = encodeURIComponent(password);

  return {
    connectionString: `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`,
  };
}
