import { createVitestConfigNode, getDirname } from '@tools/dotfiles';

export default createVitestConfigNode({
  overrides: {
    test: {
      reporters: ['default', 'verbose'],
    },
  },
  packagePath: getDirname(import.meta.url),
});
