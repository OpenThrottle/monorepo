import path from 'node:path';
import { createVitestConfigJsdom, getDirname } from '@tools/dotfiles';

export default createVitestConfigJsdom({
  overrides: {
    resolve: {
      alias: {
        '@': path.resolve(getDirname(import.meta.url), './src'),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
  setupFiles: ['./vitest.setup.ts'],
});
