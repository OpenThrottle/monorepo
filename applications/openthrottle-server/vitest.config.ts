import swc from 'unplugin-swc';
import type { ConfigEnv } from 'vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    plugins: [
      swc.vite({ module: { type: 'es6' } }), // This is required to build the test files with SWC
    ],
    resolve: {
      // OFF deliberately. Vite 8 resolves tsconfig `paths` aliases natively
      // (replacing vite-tsconfig-paths), but no tsconfig in this app's chain
      // declares `paths`, so the feature resolves nothing here.
      //
      // It is not merely inert, though: when Vite walks into an ESM workspace
      // package's sources it resolves that package's tsconfig `extends`
      // relative to the importing FILE's directory instead of the tsconfig's
      // own, turning `../../tsconfig.nestjs-package.json` into
      // `packages/tsconfig.nestjs-package.json` and failing every suite that
      // transitively imports the package with "Tsconfig not found".
      //
      // Every nestjs package uses that same `../../` extends, so this would
      // resurface once more of them flip to ESM. Re-enable only alongside a
      // Vite fix, and only if this app ever actually declares `paths`.
      tsconfigPaths: false,
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
