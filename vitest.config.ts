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
        reportsDirectory: `./coverage/monorepo`,
      },
      env,
      environment: 'node',
      globals: true,
      hookTimeout: 15_000,
      include: ['scripts/**/*.test.ts'],
      reporters: ['default'],
      retry: 0, // VITEST_RETRY in @tools/dotfiles: a flake must fail, not retry
      silent: process.env.DEBUG !== 'true',
      testTimeout: 15_000,
    },
  });

  return configuration;
};
