import swc from 'unplugin-swc';
import { ConfigEnv, loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    plugins: [
      swc.vite({ module: { type: 'es6' } }), // This is required to build the test files with SWC
    ],
    resolve: {
      // Vite 8 resolves tsconfig.json `paths` aliases natively, replacing the
      // vite-tsconfig-paths plugin.
      tsconfigPaths: true,
    },
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
      // Mirrors VITEST_TEST_TIMEOUT_MS / VITEST_HOOK_TIMEOUT_MS in
      // @tools/dotfiles, which this config does not go through. Vitest's 5000ms
      // default left I/O-heavy suites tipping over under CI shard contention.
      hookTimeout: 15_000,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
      silent: process.env.DEBUG !== 'true',
      testTimeout: 15_000,
    },
  });

  return configuration;
};
