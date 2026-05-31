/**
 * @description Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan lookup uses the same Cortex DB as the server even when `cwd` is another repo whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV =
  'OPENTHROTTLE_CORTEX_POSTGRES_URL';

/**
 * @description Resolves Postgres connection string from env.
 * Precedence: {@link OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV} → `POSTGRES_URL` → `POSTGRES_*` pieces.
 * @returns Connection string or `undefined` when required vars are missing.
 */
export function getPostgresUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const cortexUrl = env[OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]?.trim();
  if (cortexUrl) {
    return cortexUrl;
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
