import { ConfigEnv, defineConfig, loadEnv } from 'vite';

/**
 * @description Nx may set NODE_ENV=production for the test task; that pulls in
 * react-dom production test utils where React.act is unavailable. Pin test env
 * and load env from this app so @testing-library/react uses the development React build.
 */
export default (config: ConfigEnv) => {
  const { mode } = config;
  const envFromFiles = loadEnv(mode, __dirname, '');

  const configuration = defineConfig({
    cacheDir: '../../node_modules/.vite/applications/openthrottle-developer',
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
        reportsDirectory: `../../coverage/applications/openthrottle-developer`,
      },
      env: {
        ...envFromFiles,
        NODE_ENV: 'test',
      },
      environment: 'jsdom',
      globals: true,
      include: ['**/*.test.(ts|tsx)'],
      /**
       * @description vmForks runs each test file in a fresh V8 VM context inside a
       * reused worker process. Globals are isolated per file (so no cross-file state
       * leakage — unlike `isolate: false`), but the worker and module transform cache
       * are reused, which eliminates the dominant per-file module re-import cost.
       * Measured on this suite: ~730s -> ~172s user CPU, ~120s -> ~30s wall, no new
       * failures. (Plain `forks`/`threads` re-import the full module graph per file;
       * `isolate: false` is faster still but leaks global state non-deterministically.)
       */
      pool: 'vmForks',
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
    },
  });

  return configuration;
};
