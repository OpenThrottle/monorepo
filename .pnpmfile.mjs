// Intentionally empty pnpmfile (no hooks).
//
// Required by the @pnpm/plugin-esm-node-path config dependency under the
// global virtual store. That plugin injects NODE_OPTIONS=--import=<esm loader>
// so ESM imports honor NODE_PATH. In this ESM workspace ("type": "module"),
// once that loader is active, any NESTED `pnpm run` (e.g. the `check:local`
// chain, husky hooks, `pnpm nx` shelling out) inherits it — and pnpm's own
// attempt to resolve an ABSENT project pnpmfile then throws a hard
// "Cannot find module .pnpmfile.mjs" instead of being handled gracefully.
// Providing this empty file makes that resolution succeed. It is combined
// with (does not replace) the config-dependency pnpmfile, so the ESM loader
// stays active. Remove this only if the global virtual store is disabled.
export const hooks = {}
