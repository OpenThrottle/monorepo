import { join } from 'path';
import { ConfigEnv, defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default (config: ConfigEnv) => {
  const { mode } = config;

  const configuration = defineConfig({
    cacheDir: '../../node_modules/.vite/applications/openthrottle-email',
    plugins: [
      tsconfigPaths({
        ignoreConfigErrors: false,
        projects: [join(__dirname, 'tsconfig.json')],
      }),
    ],
    resolve: {
      dedupe: ['react', 'react-dom', '@testing-library/react'],
    },
    root: __dirname,
    test: {
      coverage: {
        exclude: ['build'],
        provider: 'v8',
        reportsDirectory: `../../coverage/applications/openthrottle-email`,
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
