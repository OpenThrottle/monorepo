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
       * @description `maxWorkers` caps concurrent worker processes. This is the
       * largest suite in the workspace and CI runs every project's lint/typecheck/
       * test on ONE shared 4-vCPU box via `nx ... --parallel`, so several app
       * suites + tsc typechecks run at once. Per-file heap here is modest (~355MB
       * peak, no accumulation — measured), so the developer suite alone is fine;
       * the OOM-kills come from box-wide memory contention, and this suite's plan-
       * detail workers are the biggest/most-frequent victims (reported as
       * `❯ … (0 test)`, a silent container SIGKILL). Capping to 2 (not the 4-vCPU
       * default) roughly halves this suite's contribution to peak box memory.
       * Vitest 4 removed the per-pool `poolOptions.forks.maxForks` knob; the cap is
       * this top-level `maxWorkers`. Proper fix (shard across boxes) is OT plan
       * e448a51d; do NOT raise `--max-old-space-size` — it fights the box limit.
       */
      maxWorkers: 2,
      /**
       * @description `forks` runs each test file in a fresh child process and
       * reclaims its memory on teardown between files. We moved off `vmForks`
       * because its reused worker accumulates V8 VM contexts across this large
       * suite (354 files) and crashes the worker under CI memory pressure — the
       * crash surfaces as in-flight files reporting `(0 test)` with no error
       * stack and no Vitest summary (a flaky, non-deterministic CI failure with
       * zero real assertion failures). `forks` is slower on wall-clock (it
       * re-imports the module graph per file — the cost `vmForks` avoided) but is
       * stable. Sharding the suite to claw back the wall-clock regression is
       * tracked as a follow-up.
       */
      pool: 'forks',
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
    },
  });

  return configuration;
};
