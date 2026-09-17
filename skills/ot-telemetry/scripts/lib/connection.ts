import {
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

/**
 * @description Read-only Postgres connection for the ot-telemetry report script.
 * Env precedence is delegated to `getPostgresUrl` (from
 * `@openthrottle/openthrottle-agentic-utils`) so it stays byte-for-byte in sync
 * with `databases/run-migrations.mjs` and the server's own resolution:
 * `OPENTHROTTLE_POSTGRES_URL` → `POSTGRES_URL` → `POSTGRES_*` pieces.
 *
 * Every pooled connection is opened read-only at the wire-protocol level (`options:
 * '-c default_transaction_read_only=on'`) rather than via a post-connect `SET`, so
 * there is no window — not even the first query on a freshly grown pool connection —
 * during which a bug in a metric query could mutate an engineer's database.
 */

/** Every env var this script may consult, in resolution order — named in error messages. */
export const POSTGRES_ENV_VARS_TRIED = [
  OPENTHROTTLE_POSTGRES_URL_ENV,
  'POSTGRES_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
] as const;

/** A live, read-only Postgres session plus its password-redacted URL for logging. */
export interface ReadOnlyConnection {
  readonly client: pg.Pool;
  /** Ends the underlying connection. Safe to call once; idempotent double-close is not supported. */
  close(): Promise<void>;
  readonly sanitizedUrl: string;
}

/** Wording shared by both failure paths so callers/tests can match on a stable prefix. */
export const POSTGRES_CONNECTION_FAILURE_PREFIX =
  '🚨 ot-telemetry could not reach a read-only Postgres connection.';

function describeEnvVarsTried(): string {
  return `Tried (in order): ${POSTGRES_ENV_VARS_TRIED.join(', ')}.`;
}

/**
 * Resolves the connection string, connects, and switches the session to
 * read-only. Throws a single, actionable error — naming every env var tried —
 * rather than ever returning a connection that produced a half-empty report.
 */
export async function connectReadOnly(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ReadOnlyConnection> {
  let connectionString: string;
  try {
    connectionString = getPostgresUrl(env);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${POSTGRES_CONNECTION_FAILURE_PREFIX} ${detail} ${describeEnvVarsTried()} Set one of these (see databases/README.md) and retry.`,
      { cause: error },
    );
  }

  const sanitizedUrl = sanitizePostgresUrlForLogs(connectionString);
  // `options` is passed to the server at wire-connect time (like PGOPTIONS), so
  // every connection the pool ever opens — not just the first — is read-only
  // from the moment it is established, with no post-connect `SET` window.
  const client = new pg.Pool({
    connectionString,
    options: '-c default_transaction_read_only=on',
  });

  try {
    // A Pool connects lazily; without an eager probe here, a bad connection
    // string would surface as a mysterious failure inside the first metric
    // query instead of this actionable, env-vars-named error.
    const probeClient = await client.connect();
    probeClient.release();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // The pool may or may not have opened a connection; end() is safe either way.
    await client.end().catch(() => undefined);
    throw new Error(
      `${POSTGRES_CONNECTION_FAILURE_PREFIX} Connection to ${sanitizedUrl} failed: ${detail} ${describeEnvVarsTried()}`,
      { cause: error },
    );
  }

  return {
    client,
    close: () => client.end(),
    sanitizedUrl,
  };
}
