import type { ConfigEnv } from 'vitest/config';
import { defineConfig } from 'vitest/config';

export default (_config: ConfigEnv) => {
  const env = {
    NODE_ENV: 'test',
    TZ: 'UTC',
  };

  const configuration = defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        reportsDirectory: `../../coverage/tools/ollama-proxy`,
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
