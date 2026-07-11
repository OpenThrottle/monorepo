import type { OpenThrottleClientEnv } from '@openthrottle/react-router-utils';

/**
 * @description Mirrors each app's `app/types/global.d.ts` (and
 * `@openthrottle/react-router-testing`'s `env.ts`) so this library's browser
 * code can read `window.env` without a cast. Declaration-merges with the
 * consuming app's identical augmentation. Lives in `src/types` because that is
 * the only ambient `*.d.ts` location `tsconfig.test.json` includes, so the
 * `typecheck` program also sees it.
 */
declare global {
  interface Window {
    env: OpenThrottleClientEnv;
  }
}

export {};
