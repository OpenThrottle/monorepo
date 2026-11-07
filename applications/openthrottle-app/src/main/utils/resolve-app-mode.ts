import { DEFAULT_DEV_URL } from '../data/data.server-env.ts';

export type AppMode =
  | { readonly kind: 'dev'; readonly url: string }
  | { readonly kind: 'embedded' };

export interface ResolveAppModeOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly isPackaged: boolean;
}

/**
 * @description Picks how the window gets its UI. `dev` loads the developer Vite
 * dev server (HMR) and runs no child; `embedded` runs the built developer
 * server in a utility process. `OPENTHROTTLE_APP_MODE` (`dev` | `embedded`)
 * forces a mode for an unpackaged run; a packaged app is always embedded.
 * Without the override, `electron-vite dev` (which sets
 * `NODE_ENV_ELECTRON_VITE=development`) selects `dev`.
 */
export const resolveAppMode = (options: ResolveAppModeOptions): AppMode => {
  const { env, isPackaged } = options;

  if (isPackaged) {
    return { kind: 'embedded' };
  }

  const forced = env['OPENTHROTTLE_APP_MODE'];
  const isViteDev = env['NODE_ENV_ELECTRON_VITE'] === 'development';
  const wantsDev = forced === 'dev' || (forced === undefined && isViteDev);

  if (!wantsDev) {
    return { kind: 'embedded' };
  }

  return {
    kind: 'dev',
    url: env['OPENTHROTTLE_APP_DEV_URL'] ?? DEFAULT_DEV_URL,
  };
};
