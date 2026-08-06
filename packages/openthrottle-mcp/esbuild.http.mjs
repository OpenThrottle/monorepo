/**
 * @description Bundles the streamable-HTTP MCP entry (bin-http.ts) into a single
 * self-contained ESM file for a minimal production image — no node_modules, no Nx,
 * no source tree. Workspace deps (@openthrottle/*) resolve from their `src/` so the
 * bundle is built straight from source (no pre-built dist required).
 *
 * Run: node esbuild.http.mjs   (from packages/openthrottle-mcp)
 * Out: dist/bundle/bin-http.mjs  (under dist/, which is gitignored)
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const workspacePackages = resolve(here, '..');

/** Resolve `@openthrottle/<name>` to `packages/<name>/src/index.ts` (bundle from source). */
const workspaceSourceResolver = {
  name: 'openthrottle-workspace-source',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^@openthrottle\// }, (args) => {
      const name = args.path.slice('@openthrottle/'.length);
      return { path: resolve(workspacePackages, name, 'src/index.ts') };
    });
  },
};

await build({
  entryPoints: [resolve(here, 'src/bin-http.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: resolve(here, 'dist/bundle/bin-http.mjs'),
  plugins: [workspaceSourceResolver],
  // These NestJS optional integrations are NOT installed and are reached only via
  // guarded dynamic require for features this GraphQL-only MCP never uses. Mark them
  // external: they stay as bare require()s that throw MODULE_NOT_FOUND at runtime,
  // which NestJS swallows (they never execute on this surface). Verified by booting
  // the bundle in the distroless image (zero node_modules).
  external: [
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    'class-transformer',
    'class-transformer/storage',
    'class-validator',
    'cache-manager',
  ],
  // ESM needs createRequire for any bundled CJS that calls require().
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});
