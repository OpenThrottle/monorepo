import path from 'node:path';
import {
  createVitestConfigJsdom,
  getDirname,
} from '@tools/dotfiles/vitest-config';

export default createVitestConfigJsdom({
  overrides: {
    resolve: {
      alias: {
        '@openthrottle/react-router-chat': path.resolve(
          getDirname(import.meta.url),
          './src/index.ts',
        ),
        '@openthrottle/react-router-shadcn': path.resolve(
          getDirname(import.meta.url),
          '../react-router-shadcn/src/index.ts',
        ),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
  setupFiles: ['./vitest.setup.ts'],
});
