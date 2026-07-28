import path from 'node:path';
import { createVitestConfigJsdom, getDirname } from '@tools/dotfiles';

export default createVitestConfigJsdom({
  overrides: {
    resolve: {
      alias: {
        '@openthrottle/react-router-chat': path.resolve(
          getDirname(import.meta.url),
          '../react-router-chat/src/index.ts',
        ),
        '@openthrottle/react-router-utils': path.resolve(
          getDirname(import.meta.url),
          '../react-router-utils/src/index.ts',
        ),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
  setupFiles: ['./vitest.setup.ts'],
});
