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
       * @description `maxWorkers` caps concurrent worker processes. CI runs the
       * `test` target with `nx ... --parallel=1` (see continuous-integration.yml),
       * so this suite has the shared 4-vCPU box to itself — no cross-suite memory
       * contention. Keep the cap at the 4-vCPU default: with `vmForks` + a per-worker
       * `vmMemoryLimit` (below), peak heap is bounded at ~4 x 512MB regardless of file
       * count, so 4 workers saturate the box safely. Vitest 4 removed the per-pool
       * `poolOptions.*.maxForks` knob; this top-level `maxWorkers` is the cap. Do NOT
       * raise `--max-old-space-size` — it fights the box limit, not the accumulation.
       */
      maxWorkers: 4,
      /**
       * @description `vmForks` runs each test file with an isolated module registry
       * but REUSES the worker process, so the module graph is imported once per worker
       * and amortized across the ~364 files it handles — the big wall-clock win over
       * `forks`, which re-imports per file (measured on this suite: forks 253s vs
       * vmForks 86s, ~2.9x; OT plan e448a51d task ae26a40c).
       *
       * The catch that sent us to `forks` earlier: an UNBOUNDED reused vmForks worker
       * accumulates V8 VM contexts across the whole suite and, under the 4-vCPU CI
       * box's memory ceiling, gets SIGKILLed mid-file — surfacing as in-flight files
       * reporting `(0 test)` with no error stack (a silent container OOM, not a V8
       * heap error). `test.vmMemoryLimit` is the fix: Vitest recycles a worker once
       * its heap exceeds the limit, so accumulation is bounded to ~512MB/worker while
       * keeping the import amortization. This is the config-only alternative to
       * sharding the suite across boxes — chosen because CI deliberately stays on ONE
       * box (jobCount: 1, cost tradeoff documented in continuous-integration.yml), so
       * a --shard matrix would only help by adding runners we intentionally don't pay
       * for, whereas a faster pool recovers the wall-clock at zero CI cost.
       *
       * If the `(0 test)` OOM ever reappears, LOWER `vmMemoryLimit` (more frequent
       * recycles) before touching `maxWorkers` or the box size.
       */
      pool: 'vmForks',
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
      /**
       * @description Recycle a reused vmForks worker once its heap crosses this
       * limit, bounding the V8 VM-context accumulation that OOM-crashed the suite
       * under `vmForks` before. See the `pool` comment above. Tune DOWN if the
       * `(0 test)` crash returns; 512MB already sits at the vmForks speed floor.
       */
      vmMemoryLimit: '512MB',
    },
  });

  return configuration;
};
