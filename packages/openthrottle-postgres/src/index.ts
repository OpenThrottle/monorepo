/**
 * @description Returns Postgres URL from POSTGRES_URL or POSTGRES_* env vars.
 */
export function getPostgresUrl(): string {
  const url = process.env.POSTGRES_URL?.trim();

  if (url) return url;

  const db = process.env.POSTGRES_DB;
  const host = process.env.POSTGRES_HOST;
  const password = process.env.POSTGRES_PASSWORD;
  const user = process.env.POSTGRES_USER;
  const port = Number(process.env.POSTGRES_PORT);

  if (!db || !host || !password || !port || !user) {
    throw new Error('🚨 Required Postgres environment variables are not set');
  }

  const encodedPassword = encodeURIComponent(password);

  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;
}
