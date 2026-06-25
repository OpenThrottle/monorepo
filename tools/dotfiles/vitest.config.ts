import { ConfigEnv, defineConfig } from 'vitest/config';

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
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      silent: process.env.DEBUG !== 'true',
    },
  });

  return configuration;
};
