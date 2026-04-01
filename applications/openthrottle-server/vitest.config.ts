import { join } from 'path';
import swc from 'unplugin-swc';
import { ConfigEnv, loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    plugins: [
      swc.vite({ module: { type: 'es6' } }), // This is required to build the test files with SWC

      tsconfigPaths({
        ignoreConfigErrors: false,
        projects: [join(__dirname, 'tsconfig.app.json')],
      }),
    ],
    test: {
      coverage: {
        exclude: ['build'],
        provider: 'v8',
        reportsDirectory: `../../coverage/applications/openthrottle-server`,
      },
      env: {
        ...loadEnv(mode, process.cwd(), ''),
        NODE_ENV: 'test',
      },
      environment: 'node',
      globals: true,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
      silent: process.env.DEBUG !== 'true',
    },
  });

  return configuration;
};
