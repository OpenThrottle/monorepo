import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import { installTestEnv } from './env';
import type { InstallPolyfillsOptions } from './polyfills';
import { installPolyfills } from './polyfills';

/** Options for {@link setupReactRouterTest}. */
export type SetupReactRouterTestOptions = {
  /** Overrides merged over the realistic localhost test env defaults. */
  env?: Partial<OpenThrottleEnv>;
  /**
   * Install the jsdom polyfills. All-or-nothing; defaults to `true`. Set to
   * `false` only for the rare suite that must run without the shims.
   */
  polyfills?: boolean;
  /**
   * Opt the `ResizeObserver` shim into reporting a non-zero size so recharts
   * `ResponsiveContainer` / Schedule-X render real geometry under jsdom. No-op
   * by default. See {@link InstallPolyfillsOptions.resizeObserverSize}.
   */
  resizeObserverSize?: InstallPolyfillsOptions['resizeObserverSize'];
};

/**
 * One-call Vitest setup for OpenThrottle React Router apps. Registers the
 * jest-dom matchers, bakes in `afterEach(cleanup)` so rendered DOM never leaks
 * between tests, installs the jsdom polyfills (unless `polyfills: false`), and
 * populates `window.env` from the shared fixture (merged with `options.env`).
 *
 * Apps consume it from a one-line `tests/setup.ts`:
 *
 * ```ts
 * import { setupReactRouterTest } from '@openthrottle/react-router-testing';
 * setupReactRouterTest({ env: { APP_NAME: 'openthrottle-developer' } });
 * ```
 *
 * The granular pieces ({@link installPolyfills}, {@link createTestEnv},
 * {@link installTestEnv}) are exported too, for apps that need to compose their
 * own setup.
 *
 * @publicApi
 */
export const setupReactRouterTest = (
  options: SetupReactRouterTestOptions = {},
): void => {
  const { env, polyfills = true, resizeObserverSize } = options;

  afterEach(() => {
    cleanup();
  });

  if (polyfills) {
    installPolyfills({ resizeObserverSize });
  }

  installTestEnv(env);
};
