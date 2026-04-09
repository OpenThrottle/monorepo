/**
 * @description Builds Postgres connection config from env (POSTGRES_URL, POSTGRES_*, or DOCS_MCP_*).
 */

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Returns Cortex Postgres connection string from POSTGRES_URL, POSTGRES_*, or DOCS_MCP_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): CortexPostgresConfig | undefined {
  const url = process.env.POSTGRES_URL?.trim();

  if (url) {
    return { connectionString: url };
  }

  const db = process.env.POSTGRES_DB;
  const host = process.env.POSTGRES_HOST;
  const password = process.env.POSTGRES_PASSWORD;
  const user = process.env.POSTGRES_USER;
  const port = Number(process.env.POSTGRES_PORT);

  if (!db || !host || !password || !port || !user) {
    const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;

    throw new Error(message);
  }

  const encodedPassword = encodeURIComponent(password);

  return {
    connectionString: `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`,
  };
}
