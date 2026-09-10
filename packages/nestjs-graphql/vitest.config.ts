import { createVitestConfigNode, getDirname } from '@tools/dotfiles';

export default createVitestConfigNode({
  overrides: {
    test: {
      reporters: ['default', 'tree'],
    },
  },
  packagePath: getDirname(import.meta.url),
});
