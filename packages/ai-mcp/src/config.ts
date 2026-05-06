/**
 * @description Builds Postgres connection config from env (POSTGRES_URL or POSTGRES_*).
 */

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan lookup uses the same Cortex DB as the server even when `cwd` is another repo whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV =
  'OPENTHROTTLE_CORTEX_POSTGRES_URL' as const;

/**
 * @description Resolves Cortex Postgres URL from env. Prefer {@link OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV} (injected at spawn), then `POSTGRES_URL`, then `POSTGRES_*` pieces.
 * @returns Connection string or `undefined` when required vars are missing.
 */
export function resolveCortexPostgresConnectionStringFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const ot = env[OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]?.trim();
  if (ot) {
    return ot;
  }

  const url = env.POSTGRES_URL?.trim();
  if (url) {
    return url;
  }

  const db = env.POSTGRES_DB;
  const host = env.POSTGRES_HOST;
  const password = env.POSTGRES_PASSWORD;
  const port = Number(env.POSTGRES_PORT);
  const user = env.POSTGRES_USER;

  if (!db || !host || !password || !port || !user) {
    return undefined;
  }

  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;
}

/**
 * @description Env passed to nested `pnpm exec workflow-ralph`: canonical Cortex URL from the worker plus overrides so child cwd cannot point Ralph at a different database.
 */
export function buildWorkflowRalphSpawnEnv(
  workerEnv: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const conn = resolveCortexPostgresConnectionStringFromEnv(workerEnv);
  if (conn === undefined) {
    return workerEnv;
  }

  return {
    ...workerEnv,
    [OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]: conn,
    POSTGRES_URL: conn,
  };
}

/**
 * @description Returns Cortex Postgres connection string from POSTGRES_URL or POSTGRES_* env vars.
 * @returns Connection config or undefined if not configured.
 */
export function getPostgresConfig(): CortexPostgresConfig {
  const resolved = resolveCortexPostgresConnectionStringFromEnv();
  if (!resolved) {
    const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;
    throw new Error(message);
  }

  return { connectionString: resolved };
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
