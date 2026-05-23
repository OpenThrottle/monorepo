import { createVitestConfigNode, getDirname } from '@tools/dotfiles';
import { mergeConfig } from 'vitest/config';

const baseConfig = createVitestConfigNode({
  packagePath: getDirname(import.meta.url),
});

export default mergeConfig(baseConfig, {
  test: {
    exclude: ['**/files/**'],
  },
});
