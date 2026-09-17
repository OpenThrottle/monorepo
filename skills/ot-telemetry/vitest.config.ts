import type { ConfigEnv, UserConfig } from 'vitest/config';
import { defineConfig } from 'vitest/config';

/**
 * @description Self-contained (does not use `@tools/dotfiles`'
 * `createVitestConfigNode`) because that helper's `calculateOutputDir`
 * hardcodes `packages/`/`tools/` in the path and throws for anything under
 * `skills/`. Mirrors the shape `createVitestConfigNode` would produce
 * otherwise (same env, timeouts, globals).
 */
export default (_config: ConfigEnv): UserConfig => {
  const env = {
    NODE_ENV: 'test',
    TZ: 'UTC',
  };

  const coverageRequested = process.env.VITEST_COVERAGE === 'true';

  return defineConfig({
    test: {
      coverage: {
        enabled: coverageRequested,
        provider: 'v8',
        reportsDirectory: '../../coverage/skills/ot-telemetry',
      },
      env,
      environment: 'node',
      globals: true,
      hookTimeout: 15_000,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      silent: process.env.DEBUG !== 'true',
      testTimeout: 15_000,
    },
  });
};
