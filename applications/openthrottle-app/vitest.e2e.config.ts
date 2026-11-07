import { defineConfig } from 'vitest/config';

// Opt-in smoke suite (`openthrottle-app:test-e2e`). Deliberately NOT matched by
// vitest.config.ts, so `test` never launches Electron or needs an OT server.
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globals: true,
    hookTimeout: 120_000,
    include: ['tests/e2e/**/*.e2e.ts'],
    passWithNoTests: false,
    testTimeout: 120_000,
  },
});
