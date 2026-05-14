import path from 'node:path';
import {
  createVitestConfigJsdom,
  getDirname,
} from '@tools/dotfiles/vitest-config';

export default createVitestConfigJsdom({
  overrides: {
    resolve: {
      alias: {
        '@': path.resolve(getDirname(import.meta.url), './src'),
        '@openthrottle/react-router-shadcn': path.resolve(
          getDirname(import.meta.url),
          './src/index.ts',
        ),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
  setupFiles: ['./vitest.setup.ts'],
});
