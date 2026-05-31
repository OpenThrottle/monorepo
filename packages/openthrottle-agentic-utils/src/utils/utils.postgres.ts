/**
 * Resolves Postgres URL from env, if the necessary values are not found
 * we throw an error and fail hard and fast.
 */
export function getPostgresUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
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
    throw new Error('🚨 Required Postgres environment variables are not set');
  }

  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;

  return connectionString;
}
