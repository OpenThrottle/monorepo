import { ConfigEnv, loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

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
       * @description `maxWorkers` caps concurrent worker processes. CI now runs the
       * `test` target with `nx ... --parallel=1` (see continuous-integration.yml),
       * so this suite has the shared box to itself — no cross-suite memory
       * contention. Keep the cap at the 4-vCPU default: MORE workers is better here,
       * because `forks` reuses each worker process across the files it is handed and
       * its RSS accumulates (fewer workers -> more files each -> higher peak RSS ->
       * OOM; empirically `maxWorkers: 2` crashed MORE files than 4). Vitest 4 removed
       * the per-pool `poolOptions.forks.maxForks` knob; this top-level `maxWorkers`
       * is the cap. Do NOT raise `--max-old-space-size` — it fights the box limit.
       */
      maxWorkers: 4,
      /**
       * @description `forks` runs each test file with an isolated module registry
       * (no cross-file global leakage) in a REUSED worker process. We moved off
       * `vmForks` because its reused worker accumulates V8 VM contexts across this
       * large suite (354 files) and crashes under CI memory pressure — surfacing as
       * in-flight files reporting `(0 test)` with no error stack (a silent container
       * SIGKILL, not a V8 heap error). `forks` accumulates far less and is stable,
       * but is slower (re-imports the module graph per file — the cost `vmForks`
       * avoided). Sharding the suite across boxes to claw back the wall-clock (and
       * re-enable parallel test execution) is tracked in OT plan e448a51d.
       */
      pool: 'forks',
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
    },
  });

  return configuration;
};
