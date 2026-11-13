import { DESKTOP_ENV_DEFAULTS } from '../data/data.server-env.ts';

export type ServerEnv = Readonly<Record<string, string>>;

export interface BuildServerEnvOptions {
  /** Directory holding the developer app's `server/` and `client/` build output. */
  readonly buildDir: string;
  /** The environment the child inherits (PATH, HOME, ...). */
  readonly inherited: Readonly<Record<string, string | undefined>>;
  /** Base URL of the OpenThrottle server the child proxies to. */
  readonly serverUrl: string;
  /** A known checkout; the key is omitted when there is none. */
  readonly workspaceRoot: string | undefined;
}

/** @description Narrows an env map to the entries that have a value. */
export const dropUndefined = (
  source: Readonly<Record<string, string | undefined>>,
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};

/**
 * @description The environment main hands the server child. The local origin is
 * not here: it exists only once the child has bound a port, see
 * {@link withLocalOrigin}.
 */
export const buildServerEnv = (options: BuildServerEnvOptions): ServerEnv => {
  const { buildDir, inherited, serverUrl, workspaceRoot } = options;
  const env: Record<string, string> = {
    ...dropUndefined(inherited),
    ...DESKTOP_ENV_DEFAULTS,
    API_URL_INTERNAL: serverUrl,
    APP_URL_SERVER: serverUrl,
    NODE_ENV: 'production',
    OPENTHROTTLE_DEVELOPER_BUILD_DIR: buildDir,
  };

  if (workspaceRoot !== undefined) {
    env['WORKSPACE_ROOT'] = workspaceRoot;
  }

  return env;
};

/**
 * @description Adds the dynamic local origin. `@openthrottle/react-router-utils`
 * snapshots these at import, so the child applies them after binding and
 * before importing the developer build. `API_URL_EXTERNAL` is the child's own
 * origin because the child reverse-proxies `/graphql` to the OT server.
 */
export const withLocalOrigin = (env: ServerEnv, origin: string): ServerEnv => {
  const url = new URL(origin);

  return {
    ...env,
    API_URL_EXTERNAL: origin,
    APP_URL: origin,
    APP_URL_DEVELOPER: origin,
    PORT: url.port,
  };
};
