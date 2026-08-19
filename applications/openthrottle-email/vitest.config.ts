import { ConfigEnv, defineConfig, loadEnv } from 'vite';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    cacheDir: '../../node_modules/.vite/applications/openthrottle-email',
    resolve: {
      dedupe: ['react', 'react-dom', '@testing-library/react'],
      // Vite 8 resolves tsconfig.json `paths` aliases natively (discovers the
      // tsconfig at `root`), replacing the vite-tsconfig-paths plugin.
      tsconfigPaths: true,
    },
    root: __dirname,
    test: {
      coverage: {
        exclude: ['build'],
        provider: 'v8',
        reportsDirectory: `../../coverage/applications/openthrottle-email`,
      },
      env: {
        ...loadEnv(mode, process.cwd(), ''),
        NODE_ENV: 'test',
      },
      environment: 'jsdom',
      globals: true,
      // Mirrors VITEST_TEST_TIMEOUT_MS / VITEST_HOOK_TIMEOUT_MS in
      // @tools/dotfiles, which this config does not go through. Vitest's 5000ms
      // default left I/O-heavy suites tipping over under CI shard contention.
      hookTimeout: 15_000,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
      testTimeout: 15_000,
    },
  });

  return configuration;
};
