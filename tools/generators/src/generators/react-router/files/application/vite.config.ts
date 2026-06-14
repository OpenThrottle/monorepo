import { join } from 'path';
import { analyzer } from 'vite-bundle-analyzer';
import { ConfigEnv, defineConfig, loadEnv } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { reactRouterDevTools } from 'react-router-devtools';
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default (config: ConfigEnv) => {
  const { mode } = config;

  /**
   * Here we add env vars from .env files to process.env.
   * Note the last arg is a blank string so that all env vars
   * are loaded, not just those starting with "VITE_"
   */
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

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
      include: [],
    },
    plugins: [
      shouldAnalyze && analyzer({ analyzerPort: 'auto' }),
      devtoolsJson(),
      useReactRouterDevTools && reactRouterDevTools(), // NOTE: Must come before reactRouter()
      reactRouter(),
      tailwindcss(),
      tsconfigPaths({
        ignoreConfigErrors: false,
        projects: [join(__dirname, 'tsconfig.json')],
      }),
    ],
    root: __dirname,
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
    },
    ssr: {
      noExternal: ['@phosphor-icons/react'],
    },
  });
};
