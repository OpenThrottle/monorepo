import { ConfigEnv, defineConfig, loadEnv } from 'vite';

/**
 * @description Nx may set NODE_ENV=production for the test task; that pulls in
 * react-dom production test utils where React.act is unavailable. Force test env
 * so @testing-library/react uses the development React DOM build.
 */
export default (config: ConfigEnv) => {
  const { mode } = config;
  const envFromFiles = loadEnv(mode, __dirname, '');

  const configuration = defineConfig({
    cacheDir: '../../node_modules/.vite/applications/openthrottle-admin',
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
        reportsDirectory: `../../coverage/applications/openthrottle-admin`,
      },
      env: {
        ...envFromFiles,
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
