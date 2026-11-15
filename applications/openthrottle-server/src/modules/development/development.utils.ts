/**
 * @description Whether the development GraphQL surface (test websocket
 * notifications, sample JSONL log lines) should load. Those mutations only
 * need authentication, so they are on by default outside production and off
 * when `NODE_ENV=production`; `OT_ENABLE_DEV_GRAPHQL=true` / `false` forces
 * either way.
 */
export function isDevelopmentGraphqlEnabled(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const flag = env.OT_ENABLE_DEV_GRAPHQL?.trim().toLowerCase();

  if (flag === 'true') {
    return true;
  }

  if (flag === 'false') {
    return false;
  }

  return env.NODE_ENV !== 'production';
}
