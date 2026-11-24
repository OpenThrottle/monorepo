import { OpenThrottleClientEnv } from '@openthrottle/react-router-utils';

/**
 * Ambient globals for this app: the build-time version constant and the
 * client environment on `window`.
 */
declare global {
  /**
   * Injected at build time by Vite `define` (see `createAppVersionDefine` in
   * `@tools/dotfiles/app-version`) from this app's package.json `version`.
   */
  const __APP_VERSION__: string;

  /**
   * @description Define the environment variables that are available to this app.
   */
  interface Window {
    env: OpenThrottleClientEnv;
  }
}

export {};
