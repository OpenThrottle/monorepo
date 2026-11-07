import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      exclude: ['out', 'dist'],
      provider: 'v8',
      reportsDirectory: '../../coverage/applications/openthrottle-app',
    },
    // The Nx executor can leave NODE_ENV=production, which loads React's
    // production build (no `act`) and breaks Testing Library.
    env: { NODE_ENV: 'test' },
    environment: 'node',
    globals: true,
    include: [
      'scripts/**/*.spec.ts',
      'src/**/*.spec.ts',
      'src/**/*.test.tsx',
      'tests/**/*.spec.ts',
    ],
    passWithNoTests: false,
  },
});
