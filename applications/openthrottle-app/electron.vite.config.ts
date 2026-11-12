import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

// electron-vite builds the main and preload bundles, plus ONE tiny renderer:
// the connection screen (src/renderer), loaded by main with loadFile. The
// product UI is still the Developer app's own build, served by the embedded
// server; do not grow this renderer into a second app.
export default defineConfig({
  main: {
    build: {
      lib: {
        // `main` is the Electron entry; `server` is forked into a
        // utilityProcess and hosts the developer production server.
        entry: {
          main: resolve(import.meta.dirname, 'src/main/main.ts'),
          server: resolve(import.meta.dirname, 'src/server/server-entry.ts'),
        },
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(import.meta.dirname, 'src/preload/preload.ts'),
        // A sandboxed preload cannot be ESM, so emit a single CommonJS file.
        formats: ['cjs'],
      },
    },
  },
  renderer: {
    build: {
      outDir: resolve(import.meta.dirname, 'out/renderer'),
      rolldownOptions: {
        input: resolve(import.meta.dirname, 'src/renderer/index.html'),
      },
    },
    plugins: [react(), tailwindcss()],
    root: resolve(import.meta.dirname, 'src/renderer'),
  },
});
