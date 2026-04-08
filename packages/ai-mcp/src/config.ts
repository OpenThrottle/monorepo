/**
 * @description Builds Postgres connection config from env (POSTGRES_URL or POSTGRES_*).
 */

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Returns Cortex Postgres connection string from POSTGRES_URL or POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): CortexPostgresConfig {
  const url = process.env.POSTGRES_URL;

  if (url?.trim()) {
    return { connectionString: url.trim() };
  }

  const db = process.env.POSTGRES_DB;
  const host = process.env.POSTGRES_HOST;
  const password = process.env.POSTGRES_PASSWORD;
  const port = Number(process.env.POSTGRES_PORT);
  const user = process.env.POSTGRES_USER;

  if (!db || !host || !password || !port || !user) {
    const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;
    throw new Error(message);
  }

  const encodedPassword = encodeURIComponent(password);

  return {
    connectionString: `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`,
  };
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
