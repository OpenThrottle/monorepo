import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterDevTools } from 'react-router-devtools';
import type { ConfigEnv } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import devtoolsJson from 'vite-plugin-devtools-json';

export default (config: ConfigEnv) => {
  const { mode } = config;

  /**
   * Here we add env vars from .env files to process.env.
   * Note the last arg is a blank string so that all env vars
   * are loaded, not just those starting with "VITE_"
   */
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  /**
   * One-origin mode (docs/monorepo/phone-access.md): with API_URL_EXTERNAL="/api"
   * the browser calls `/api/...` on this dev server, which forwards it — the
   * graphql-ws upgrade included — to the API with the prefix stripped. SSR
   * keeps calling API_URL_INTERNAL directly, so that is the proxy target too.
   */
  const apiProxyTarget =
    process.env.API_URL_INTERNAL ?? 'http://localhost:6021';
  /**
   * Extra hostnames the dev server answers to, comma-separated — e.g. the
   * tailnet name `pnpm run remote:serve` prints. HMR needs no matching config:
   * its client connects to the page's own origin, so behind an HTTPS forward
   * it already uses `wss://<host>` on 443.
   */
  const extraAllowedHosts = (process.env.DEV_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
  const shouldAnalyze = process.env.ANALYZE === 'true';
  const useReactRouterDevTools = process.env.REACT_ROUTER_DEV_TOOLS === 'true';

  return defineConfig({
    build: {
      cssMinify: 'lightningcss',
    },
    css: {
      postcss: './postcss.config.mjs',
    },
    logLevel: 'info',
    optimizeDeps: {
      // Pre-bundle so CJS dist is converted to ESM for the browser (ssr.external still loads CJS in Node).
      // include: ['@openthrottle/openthrottle-notifications'],
    },
    plugins: [
      shouldAnalyze && analyzer({ analyzerPort: 'auto' }),
      devtoolsJson(),
      useReactRouterDevTools && reactRouterDevTools(), // NOTE: Must come before reactRouter()
      reactRouter(),
      tailwindcss(),
    ],
    resolve: {
      // Vite 8 resolves tsconfig.json `paths` aliases natively (discovers the
      // tsconfig at `root`), replacing the vite-tsconfig-paths plugin.
      tsconfigPaths: true,
    },
    root: __dirname,
    server: {
      allowedHosts: ['developer.local', ...extraAllowedHosts],
      // Unset on the host (Vite default: localhost). The compose dev profile sets
      // HOST=0.0.0.0 so the dev server is reachable through the published port.
      host: process.env.HOST,
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      proxy: {
        // Anchored so a future `/api-*` page route is not swallowed.
        '^/api(/|$)': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '') || '/',
          target: apiProxyTarget,
          ws: true,
          // X-Forwarded-For lets the server rate-limit per client, not per proxy.
          xfwd: true,
        },
      },
    },
    ssr: {
      // external: ['@openthrottle/openthrottle-notifications'],
      /*
        `ts-morph` carries the whole TypeScript compiler (~11 MB). It is reached
        only from the IDE engine adapter, which routes already load through a
        dynamic `import()`, so bundling it bought nothing and made the SSR chunk
        11.4 MB. Left external, Node resolves it from node_modules on the first
        request that actually needs symbol analysis. `@openthrottle/openthrottle-ide`
        itself stays bundled — it is source-first (`main: ./src/index.ts`), so
        Node could not require it directly.

        `@vscode/ripgrep` is external for a different reason: bundling it moved
        its runtime lookup for the platform-specific `rg` binary next to the SSR
        output, where the optional dependency is not reachable, and it threw at
        module load — taking down every IDE route on a production build.
      */
      external: ['@vscode/ripgrep', 'ts-morph'],
      noExternal: ['@phosphor-icons/react'],
    },
  });
};
