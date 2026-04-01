import path from 'node:path';
import { defineViteConfig, getDirname } from '@tools/dotfiles';
import tailwindcss from '@tailwindcss/vite';

/**
 * @link https://vitejs.dev/guide/build.html#library-mode
 * @link https://nx.dev/recipes/vite/configure-vite#typescript-paths
 * @description Configuration for building your library.
 */
export default defineViteConfig({
  entry: ['src/index.ts', 'src/index.css'],
  overrides: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(getDirname(import.meta.url), './src'),
      },
    },
  },
  packagePath: getDirname(import.meta.url),
  packageType: 'react',
});
