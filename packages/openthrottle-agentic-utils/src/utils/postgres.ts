import pg from 'pg';

/**
 * Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan
 * lookup uses the same OpenThrottle DB as the server even when `cwd` is another repo
 * whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_POSTGRES_URL_ENV = `OPENTHROTTLE_POSTGRES_URL`;

/**
 * Hint appended when Postgres connectivity check fails (detail is interpolated).
 */
export const POSTGRES_UNREACHABLE_HINT = `\n   Check POSTGRES_URL (or POSTGRES_*) and network connectivity.\n`;

/**
 * Thrown by {@link getPostgresUrl} when required Postgres env vars are missing or invalid.
 */
export const POSTGRES_URL_MISSING_ERROR = `🚨 Required Postgres environment variables are not set`;

/**
 * Resolves Postgres connection string from env.
 * Precedence: {@link OPENTHROTTLE_POSTGRES_URL_ENV} → `POSTGRES_URL` → `POSTGRES_*` pieces.
 * @throws When required vars are missing or `POSTGRES_PORT` is invalid.
 */
export function getPostgresUrl(env: NodeJS.ProcessEnv = process.env): string {
  const otPostgresUrl = env[OPENTHROTTLE_POSTGRES_URL_ENV]?.trim();
  if (otPostgresUrl) {
    return otPostgresUrl;
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
    throw new Error(POSTGRES_URL_MISSING_ERROR);
  }

  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;

  return connectionString;
}

/**
 * Env var holding a full connection URL for the `cms` database. Overrides the
 * URL derived from the primary connection.
 */
export const CMS_POSTGRES_URL_ENV = `CMS_POSTGRES_URL`;

/** Env var naming the `cms` database on the primary server. */
export const CMS_POSTGRES_DB_ENV = `CMS_POSTGRES_DB`;

/** Database name used for `cms` when {@link CMS_POSTGRES_DB_ENV} is unset. */
export const CMS_DEFAULT_DATABASE_NAME = `cms`;

/** Outcome of {@link getCmsPostgresUrl}. */
export type CmsPostgresUrlResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly url: string };

/** {@link getPostgresUrl} as a result instead of a throw. */
function resolvePrimaryPostgresUrl(
  env: NodeJS.ProcessEnv,
): CmsPostgresUrlResult {
  try {
    return { ok: true, url: getPostgresUrl(env) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { error: detail, ok: false };
  }
}

/**
 * @description Resolves the `cms` database's connection string from env, with
 * the same precedence as the `cms` entry in `databases/database-registry.ts`:
 * {@link CMS_POSTGRES_URL_ENV}, else the primary connection
 * ({@link getPostgresUrl}) with its database swapped for
 * {@link CMS_POSTGRES_DB_ENV} (default {@link CMS_DEFAULT_DATABASE_NAME}).
 * Returns a result rather than throwing so callers can report a missing
 * connection without a `try`/`catch`.
 * @public
 */
export function getCmsPostgresUrl(
  env: NodeJS.ProcessEnv = process.env,
): CmsPostgresUrlResult {
  const explicit = env[CMS_POSTGRES_URL_ENV]?.trim();
  if (explicit) {
    return { ok: true, url: explicit };
  }

  const primary = resolvePrimaryPostgresUrl(env);
  if (!primary.ok) {
    return primary;
  }

  const databaseName =
    env[CMS_POSTGRES_DB_ENV]?.trim() || CMS_DEFAULT_DATABASE_NAME;

  try {
    const parsed = new URL(primary.url);
    parsed.pathname = `/${encodeURIComponent(databaseName)}`;
    return { ok: true, url: parsed.toString() };
  } catch {
    return {
      error: `🚨 The primary Postgres URL could not be parsed`,
      ok: false,
    };
  }
}

export function getPostgresLoggingLevel(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const isDev = env.NODE_ENV === 'development';
  const logLevel = env.POSTGRES_LOGGING ?? 'info';

  console.log('🎯 🎯 logLevel 🎯 🎯', { isDev, logLevel });

  return true;
}

/**
 * Verifies Postgres is reachable (connect + `SELECT 1`). Throws when the
 * connection string is missing or the check fails.
 */
export async function ensurePostgresReachable(
  connectionString: string,
): Promise<void> {
  const trimmed = connectionString.trim();
  if (!trimmed) {
    throw new Error('Postgres connection string is required.');
  }

  const client = new pg.Client({ connectionString: trimmed });

  try {
    await client.connect();
    await client.query('SELECT 1');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Postgres database is unreachable. ${detail}${POSTGRES_UNREACHABLE_HINT}`,
    );
  } finally {
    await client.end();
  }
}

/**
 * Fallback when a Postgres URL cannot be parsed for log redaction.
 */
export const UNPARSEABLE_POSTGRES_URL_LOG_LABEL = `(unparseable POSTGRES_URL)`;

/**
 * Returns a Postgres URL safe for logs (password stripped). Falls back if parsing fails.
 */
export function sanitizePostgresUrlForLogs(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    url.password = '';

    return url.toString();
  } catch {
    return UNPARSEABLE_POSTGRES_URL_LOG_LABEL;
  }
}
