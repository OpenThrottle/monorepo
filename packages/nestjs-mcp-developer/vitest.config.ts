import path from 'node:path';
import {
  createVitestConfigNode,
  getDirname,
} from '@tools/dotfiles/vitest-config';

export default createVitestConfigNode({
  overrides: {
    resolve: {
      alias: {
        '@openthrottle/openthrottle-mcp/nest': path.resolve(
          getDirname(import.meta.url),
          '../openthrottle-mcp/src/nest/index.ts',
        ),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
});
