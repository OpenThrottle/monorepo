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
       * @description Pool differs by environment on purpose.
       *
       * Locally we use `vmForks`: each file runs in a fresh V8 VM context inside a
       * reused worker, so globals are isolated per file (no cross-file leakage,
       * unlike `isolate: false`) while the worker and module transform cache are
       * reused — eliminating the dominant per-file re-import cost. Measured on this
       * suite: ~730s -> ~172s user CPU, ~120s -> ~30s wall.
       *
       * In CI we use the stable default `forks` pool. On the Linux CI runners a
       * `vmForks` worker dies mid-suite (surfacing as a stuck `(0 test)` file and a
       * truncated, summary-less run) in a way that does not reproduce on the dev
       * machines — a known class of VM-context instability. `forks` has no VM
       * context to crash; the full suite is clean under it. The per-file re-import
       * cost is an acceptable trade for a reliable pipeline. (The plan-detail WS
       * realm crash that first exposed this is fixed independently in tests/setup.)
       */
      pool: process.env.CI ? 'forks' : 'vmForks',
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
    },
  });

  return configuration;
};
