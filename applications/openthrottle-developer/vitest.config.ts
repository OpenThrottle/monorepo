import { availableParallelism } from 'node:os';
import type { ConfigEnv } from 'vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * @description Worker cap. CI keeps the hand-tuned 4 (see the `maxWorkers` note
 * below — it is sized for the shared 4-vCPU box, not for the machine it happens
 * to be running on). A developer laptop has no such constraint and was leaving
 * most of its cores idle, so locally this scales with the machine, leaving two
 * cores for the OS and capping at 8 — past that the workers contend and the
 * suite gets slower again (measured on a 10-core M1 Max: 4 -> 167s, 8 -> 130s,
 * 10 -> 136s).
 *
 * `vmMemoryLimit` bounds each worker independently, so peak heap stays
 * ~maxWorkers x 512MB and more workers do not risk the OOM described below.
 */
const resolveMaxWorkers = (): number => {
  if (process.env.CI) {
    return 4;
  }

  return Math.max(4, Math.min(8, availableParallelism() - 2));
};

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
      // Mirrors VITEST_TEST_TIMEOUT_MS / VITEST_HOOK_TIMEOUT_MS in
      // @tools/dotfiles, which this config does not go through. Vitest's 5000ms
      // default left I/O-heavy suites tipping over under CI shard contention.
      hookTimeout: 15_000,
      include: ['**/*.test.(ts|tsx)'],
      /**
       * @description `maxWorkers` caps concurrent worker processes. CI runs the
       * `test` target at Nx's default concurrency on a 4-vCPU box shared with up to
       * two sibling suites from the same shard (see continuous-integration.yml), so
       * this cap is what bounds this suite's share of it. Keep the CI value at the
       * 4-vCPU default (see `resolveMaxWorkers`, which only scales up off CI):
       * with `vmForks` + a per-worker
       * `vmMemoryLimit` (below), peak heap is bounded at ~4 x 512MB regardless of file
       * count, so 4 workers saturate the box safely. Vitest 4 removed the per-pool
       * `poolOptions.*.maxForks` knob; this top-level `maxWorkers` is the cap. Do NOT
       * raise `--max-old-space-size` — it fights the box limit, not the accumulation.
       */
      maxWorkers: resolveMaxWorkers(),
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
       * keeping the import amortization.
       *
       * ⚠️ This JSDoc used to conclude here that "the matrix cannot lower this suite's
       * wall-clock — a faster pool can", on the premise that PROJECT sharding splits
       * the affected project list and this suite is one Nx project, so whichever box
       * draws it runs all of it. The premise is still true. The conclusion was not:
       * Vitest's own `--shard` splits WITHIN a project, which is a third lever the
       * either/or framing missed. CI now runs this suite as three shards across the
       * 3-box matrix — 679 files / 137s whole, ~227 files / ~46s per shard (OT plan
       * 9fc16731).
       *
       * The pool tuning here is ORTHOGONAL to that and still load-bearing: `--shard`
       * lowers how many files a box carries, and does nothing about V8 VM-context
       * accumulation within the files it does carry. Its own measured win (forks 253s
       * -> vmForks 86s, OT plan e448a51d) stands unchanged, and it remains the only
       * thing standing between this suite and the silent `(0 test)` OOM. Do not treat
       * sharding as a reason to revisit it. See docs/reliability/developer-vitest-pool.md.
       *
       * If the `(0 test)` OOM ever reappears, LOWER `vmMemoryLimit` (more frequent
       * recycles) before touching `maxWorkers` or the box size.
       */
      pool: 'vmForks',
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
      testTimeout: 15_000,
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
