import { createAppVersionDefine } from '@tools/dotfiles/app-version';
import type { ConfigEnv } from 'vite';
import { defineConfig, loadEnv } from 'vite';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    cacheDir: '../../node_modules/.vite/applications/openthrottle-cms',
    define: createAppVersionDefine(__dirname),
    resolve: {
      // jotai and react-dnd are context libraries: cms-core's hooks must read the Provider the
      // app mounts, and pnpm can install two physical copies (peer-variant suffixes) of each.
      dedupe: [
        '@testing-library/react',
        'jotai',
        'react',
        'react-dnd',
        'react-dom',
      ],
      // Vite 8 resolves tsconfig.json `paths` aliases natively (discovers the
      // tsconfig at `root`), replacing the vite-tsconfig-paths plugin.
      tsconfigPaths: true,
    },
    root: __dirname,
    test: {
      coverage: {
        exclude: ['build'],
        provider: 'v8',
        reportsDirectory: `../../coverage/applications/openthrottle-cms`,
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
