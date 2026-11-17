import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ConfigEnv } from 'vitest/config';
import { defineConfig } from 'vitest/config';

export default (_config: ConfigEnv) => {
  // const { mode } = _config;

  const env = {
    NODE_ENV: 'test',
    // Mirrors @tools/dotfiles: keep the cursor driver's attribution-off config
    // copy out of the real ~/.openthrottle/cursor-config.
    OPENTHROTTLE_CURSOR_CONFIG_DIR: join(
      tmpdir(),
      'openthrottle-vitest-cursor-config',
    ),
    TZ: 'UTC',
  };

  const configuration = defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        reportsDirectory: `../../coverage/tools/workflows`,
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
      retry: 0, // VITEST_RETRY in @tools/dotfiles: a flake must fail, not retry
      silent: process.env.DEBUG !== 'true',
      testTimeout: 15_000,
    },
  });

  return configuration;
};
