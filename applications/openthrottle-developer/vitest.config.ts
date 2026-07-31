import { resolve } from 'node:path';
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
      /**
       * @description Resolve the isomorphic `@openthrottle/openthrottle-plan-config`
       * from its TypeScript source rather than its built `dist`. The package is
       * consumed via its `exports` map (dist), so tests otherwise depend on its
       * `build` output being present — which made the suite fail in CI whenever the
       * remote Nx cache restored an incomplete `dist` (typecheck resolved the
       * `.d.ts` but Vite could not resolve the missing `index.js`: "Failed to
       * resolve import @openthrottle/openthrottle-plan-config"). Pointing tests at
       * source removes that build/cache dependency; the package is pure and
       * jsdom-safe, so behavior is identical to the compiled output.
       */
      alias: [
        {
          find: /^@openthrottle\/openthrottle-plan-config$/,
          replacement: resolve(
            __dirname,
            '../../packages/openthrottle-plan-config/src/index.ts',
          ),
        },
      ],
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
      /**
       * @description A reused `vmForks` worker accumulates heap across the many
       * files it runs; Vitest's default recycle threshold is derived from *host*
       * RAM, which a CI container over-reports, so the worker is OOM-killed by the
       * cgroup before it ever recycles (the run dies mid-suite with no summary).
       * Pin an explicit limit so each worker recycles well under the container
       * ceiling. Local runs (more RAM) never hit it. (This is the memory half of the
       * CI fix; the plan-detail WebSocket realm crash is handled in tests/setup.)
       */
      vmMemoryLimit: '512MB',
    },
  });

  return configuration;
};
