/**
 * @description Builds Cortex Postgres connection config from env (CORTEX_POSTGRES_URL or CORTEX_POSTGRES_*).
 */

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Returns Cortex Postgres connection string from CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getCortexPostgresConfig(): CortexPostgresConfig | undefined {
  const url = process.env.POSTGRES_URL;

  if (url?.trim()) {
    return { connectionString: url.trim() };
  }

  // const testing = process.env.MOCK_ENV ?? '__UNSET__';
  // console.log('🔍 🔍 🔍 MOCK_ENV 🔍 🔍 🔍', testing, process.env);

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

/**
 * @description Returns the canonical GitHub username for author/assignee when set.
 * Used to enforce GitHub username (not display name) for plan and task author/assignee.
 * Reads GITHUB_USER or CORTEX_GITHUB_USER (trimmed).
 */
export function getDefaultGitHubUser(): string | undefined {
  const v = process.env.GITHUB_USER?.trim() ?? process.env.GITHUB_USER?.trim();

  return v === '' ? undefined : v;
}
