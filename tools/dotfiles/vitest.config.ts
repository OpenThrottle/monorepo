import type { ConfigEnv } from 'vitest/config';
import { defineConfig } from 'vitest/config';

export default (_config: ConfigEnv) => {
  // const { mode } = _config;

  const env = {
    NODE_ENV: 'test',
    TZ: 'UTC',
  };

  // Coverage is opt-in to match the `VITEST_COVERAGE` gate the exported
  // factory enforces in src/vitest-config.ts (avoids the concurrent v8 `.tmp`
  // race). This package can't consume its own factory yet (bootstrap concern),
  // so mirror the gating by hand.
  const coverageRequested = process.env.VITEST_COVERAGE === 'true';

  const configuration = defineConfig({
    test: {
      coverage: {
        enabled: coverageRequested,
        provider: 'v8',
        reportsDirectory: `../../coverage/tools/dotfiles`,
      },
      env,
      environment: 'node',
      globals: true,
      // Mirrors VITEST_TEST_TIMEOUT_MS / VITEST_HOOK_TIMEOUT_MS in
      // @tools/dotfiles, which this config does not go through. Vitest's 5000ms
      // default left I/O-heavy suites tipping over under CI shard contention.
      hookTimeout: 15_000,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      silent: process.env.DEBUG !== 'true',
      testTimeout: 15_000,
    },
  });

  return configuration;
};
