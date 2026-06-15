import { ConfigEnv, defineConfig, loadEnv } from 'vite';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    cacheDir: '../../node_modules/.vite/applications/<%= name %>',
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
        reportsDirectory: `../../coverage/applications/<%= name %>`,
      },
      env: {
        ...loadEnv(mode, process.cwd(), ''),
        NODE_ENV: 'test',
      },
      environment: 'jsdom',
      globals: true,
      include: ['**/*.test.(ts|tsx)'],
      reporters: ['default'],
      setupFiles: ['./tests/setup.ts'],
    },
  });

  return configuration;
};
