import { ConfigEnv, defineConfig } from 'vitest/config';

export default (_config: ConfigEnv) => {
  // const { mode } = _config;

  const env = {
    NODE_ENV: 'test',
    TZ: 'UTC',
  };

  const configuration = defineConfig({
    test: {
      coverage: {
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
