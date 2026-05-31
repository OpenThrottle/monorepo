import pg from 'pg';

/**
 * @description Env var set by BullMQ workers when spawning nested `workflow-ralph` so plan lookup uses the same Cortex DB as the server even when `cwd` is another repo whose tooling overwrites `POSTGRES_URL`.
 */
export const OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV =
  'OPENTHROTTLE_CORTEX_POSTGRES_URL';

/** Hint appended when Postgres connectivity check fails (detail is interpolated). */
export const POSTGRES_UNREACHABLE_HINT_SUFFIX =
  '\n   Check POSTGRES_URL (or POSTGRES_*) and network connectivity.\n';

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

/**
 * @description Verifies Postgres is reachable (connect + `SELECT 1`). Throws when the connection string is missing or the check fails.
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
      `Postgres database is unreachable. ${detail}${POSTGRES_UNREACHABLE_HINT_SUFFIX}`,
    );
  } finally {
    await client.end();
  }
}

/** Fallback when a Postgres URL cannot be parsed for log redaction. */
export const UNPARSEABLE_POSTGRES_URL_LOG_LABEL = '(unparseable POSTGRES_URL)';

/**
 * @description Returns a Postgres URL safe for logs (password stripped). Falls back if parsing fails.
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
