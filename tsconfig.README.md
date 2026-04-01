# Openthrottle shared tsconfig (Node ESM + tsc)

## Why `.js` extensions in imports

We use the TypeScript compiler only (no bundler). Two things make `.js` in source necessary:

1. **TypeScript does not rewrite import paths.** Whatever you write (e.g. `from './utils.js'`) is emitted as-is. The emitted `.js` file is what Node runs.
2. **Node ESM resolution** requires explicit file extensions for relative specifiers. `import x from './utils'` fails at runtime; Node does not try `./utils.js`. So the **emitted** file must contain `from './utils.js'`, which means you must write `.js` in the **source**.

So for Node ESM with a plain `tsc` build, use `.js` in relative local imports (e.g. `from '../utils/tool-result.js'`). Package imports (e.g. `from 'zod'`) stay extensionless.

## Shared config

- **`packages/openthrottle/tsconfig.node.json`** sets `module` and `moduleResolution` to **NodeNext** so TypeScript enforces the extension requirement and emit is valid for Node.
- **mcp-developer** and **nodejs-graphql** extend this file (`../tsconfig.node.json`) so they share the same Node ESM rules.

## If you later use a bundler

If you switch to a bundler (e.g. tsup, esbuild), the bundle can resolve extensionless specifiers and you can drop `.js` from source. You’d then use `moduleResolution: "bundler"` in this shared config instead of NodeNext.
