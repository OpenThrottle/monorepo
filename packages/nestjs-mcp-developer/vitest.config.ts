import path from 'node:path';
import {
  createVitestConfigNode,
  getDirname,
} from '@tools/dotfiles/vitest-config';

export default createVitestConfigNode({
  overrides: {
    resolve: {
      alias: {
        '@openthrottle/mcp-developer/nest': path.resolve(
          getDirname(import.meta.url),
          '../mcp-developer/src/nest/index.ts',
        ),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
});
