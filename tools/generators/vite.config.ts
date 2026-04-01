import { defineViteConfig, getDirname } from '@tools/dotfiles';

/**
 * @link https://vitejs.dev/guide/build.html#library-mode
 * @link https://nx.dev/recipes/vite/configure-vite#typescript-paths
 * @description Configuration for building your library.
 */
export default defineViteConfig({
  packagePath: getDirname(import.meta.url),
  packageType: 'react',
});
