import { defineConfig } from 'vite';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import dts from 'vite-plugin-dts';

/**
 * @link https://vitejs.dev/guide/build.html#library-mode
 * @link https://nx.dev/recipes/vite/configure-vite#typescript-paths
 * @description Configuration for building your library.
 */
export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: ['src/index.ts'],
      fileName: (format, entryName) => {
        const isESM = format === 'es';
        const extension = isESM ? 'mjs' : 'cjs';

        return `${entryName}.${extension}`;
      },
      formats: ['cjs', 'es'],
    },
    reportCompressedSize: true,
    ssr: true,
  },
  cacheDir: '../../node_modules/.vite/tools/dotfiles',
  plugins: [
    dts({
      rollupTypes: true,
      tsconfigPath: 'tsconfig.lib.json',
    }),
    nxCopyAssetsPlugin(['README.md']),
  ],
  root: __dirname,
});
