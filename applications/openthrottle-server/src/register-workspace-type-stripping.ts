import { registerHooks } from 'node:module';

import { stripWorkspaceTypes } from './workspace-type-stripping.ts';

/**
 * @description Preload for the production image, passed to Node as
 * `--import=/app/build/src/register-workspace-type-stripping.js` (see `NODE_OPTIONS` in
 * Dockerfile.NestJS). It must be a preload rather than an import from `main.ts`: ESM links every
 * static import before any module body runs, so a hook registered from inside the graph would be
 * installed after the imports it exists to fix had already failed.
 */
registerHooks({
  load: (url, context, nextLoad) =>
    stripWorkspaceTypes(url, nextLoad(url, context)),
});
