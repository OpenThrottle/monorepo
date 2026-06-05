import pg from 'pg';

/**
 * Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan
 * lookup uses the same Cortex DB as the server even when `cwd` is another repo
 * whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_POSTGRES_URL_ENV = `OPENTHROTTLE_CORTEX_POSTGRES_URL`;

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
