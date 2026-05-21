import { defineViteConfig, getDirname } from '@tools/dotfiles';

/**
 * Configuration for building your library.
 *
 * @link https://vitejs.dev/guide/build.html#library-mode
 * @link https://nx.dev/recipes/vite/configure-vite#typescript-paths
 */
export default defineViteConfig({
  packagePath: getDirname(import.meta.url),
  packageType: 'react',
});
