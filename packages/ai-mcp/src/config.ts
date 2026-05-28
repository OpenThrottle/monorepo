/**
 * @description Builds Postgres connection config from env (POSTGRES_URL or POSTGRES_*).
 */

export interface CortexPostgresConfig {
  readonly connectionString: string;
}

/**
 * @description Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan lookup uses the same Cortex DB as the server even when `cwd` is another repo whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV = `OPENTHROTTLE_CORTEX_POSTGRES_URL`;

/**
 * @description When set (non-empty after trim) on the BullMQ worker, nested `workflow-ralph` children receive this as `HOME` so Claude Code and similar CLIs resolve OAuth paths under a directory you control (e.g. bind-mount host credentials into `/var/ralph-home` and set this to that path).
 */
export const WORKFLOW_RALPH_SPAWN_HOME_ENV = `WORKFLOW_RALPH_SPAWN_HOME`;

/**
 * @description When set on the worker, nested Ralph children receive this as `XDG_CONFIG_HOME` for tools that read config from XDG paths instead of `HOME` alone.
 */
export const WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV = `WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME`;

/**
 * @description Resolves Cortex Postgres URL from env. Prefer {@link OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV} (injected at spawn), then `POSTGRES_URL`, then `POSTGRES_*` pieces.
 * @returns Connection string or `undefined` when required vars are missing.
 */
export function resolveCortexPostgresConnectionStringFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const ot = env[OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]?.trim();
  if (ot) {
    console.log('🤖 🤖 🤖 🤖 🤖 OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV', ot);
    return ot;
  }

  const url = env.POSTGRES_URL?.trim();
  if (url) {
    console.log('🤖 🤖 🤖 🤖 🤖 POSTGRES_URL', url);
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
  const connectionString = `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;
  console.log('🤖 🤖 🤖 🤖 🤖 connectionString', connectionString);
  // postgresql://openthrottle_user:openthrottle_password@localhost:6010/opettle

  return connectionString;
}

/**
 * @description Applies optional identity overrides from {@link WORKFLOW_RALPH_SPAWN_HOME_ENV} and {@link WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV} so queue workers can align nested CLIs with mounted credentials.
 */
export function applyWorkflowRalphSpawnIdentityOverrides(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const home = env[WORKFLOW_RALPH_SPAWN_HOME_ENV]?.trim();
  const xdgConfigHome = env[WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV]?.trim();

  if (
    (home === undefined || home === '') &&
    (xdgConfigHome === undefined || xdgConfigHome === '')
  ) {
    return env;
  }

  return {
    ...env,
    ...(home !== undefined && home !== '' ? { HOME: home } : {}),
    ...(xdgConfigHome !== undefined && xdgConfigHome !== ''
      ? { XDG_CONFIG_HOME: xdgConfigHome }
      : {}),
  };
}

/** Optional overrides for {@link buildWorkflowRalphSpawnEnv}. */
export interface BuildWorkflowRalphSpawnEnvOptions {
  /**
   * When set (non-empty), forces nested Ralph to use this URL (e.g. same string as TypeORM `url`),
   * regardless of `workerEnv`, so foreign `cwd` tooling cannot desync plan lookup from the API DB.
   */
  readonly canonicalCortexPostgresUrl?: string;
}

/**
 * @description Env passed to nested `pnpm exec workflow-ralph`: canonical Cortex URL from the worker plus overrides so child cwd cannot point Ralph at a different database.
 */
export function buildWorkflowRalphSpawnEnv(
  workerEnv: NodeJS.ProcessEnv,
  options?: BuildWorkflowRalphSpawnEnvOptions,
): NodeJS.ProcessEnv {
  const trimmed = options?.canonicalCortexPostgresUrl?.trim();
  const conn =
    trimmed !== undefined && trimmed !== ''
      ? trimmed
      : resolveCortexPostgresConnectionStringFromEnv(workerEnv);

  const withPostgres: NodeJS.ProcessEnv =
    conn === undefined
      ? workerEnv
      : {
          ...workerEnv,
          [OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]: conn,
          POSTGRES_URL: conn,
        };

  return applyWorkflowRalphSpawnIdentityOverrides(withPostgres);
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
