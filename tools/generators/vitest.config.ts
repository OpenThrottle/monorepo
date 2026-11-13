import { createVitestConfigNode, getDirname } from '@tools/dotfiles';
import { configDefaults, mergeConfig } from 'vitest/config';

const baseConfig = createVitestConfigNode({
  packagePath: getDirname(import.meta.url),
});

export default mergeConfig(baseConfig, {
  test: {
    // Extend, never replace, vitest's defaults: a bare list drops their
    // `**/node_modules/**`, and this suite then collected @tools/dotfiles'
    // tests through its workspace symlink.
    exclude: [...configDefaults.exclude, '**/files/**'],
  },
});
