---
name: ot-client-node-boundary
description: >-
  Keep Node builtins out of OpenThrottle browser bundles. USE WHEN importing a
  node:* builtin or a Node-only package from code a browser bundle could reach;
  adding to a package barrel (index.ts) that React Router apps import; or a
  build or console says "Node builtins reached the client bundle" or "has been
  externalized for browser compatibility". Not for folder placement
  (ot-folders) or server conventions (ot-stack).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '2.1.0'
---

# Client/Node boundary

Never let a Node builtin become reachable from browser code. Breaking this passes lint and
typecheck and only shows up later, which is why it is a skill and not a line in `AGENTS.md`.

Vite does not error when a client module's import graph reaches a `node:*` import. It externalizes
the builtin and ships a stub in its place: an empty object in a production build, so the page
breaks with `homedir is not a function` when the code runs; a console warning in the dev server:

```
Module "node:os" has been externalized for browser compatibility.
Cannot access "node:os.homedir" in client code.
```

## What catches it

**`typecheck` and `lint` pass when you break this.** The `clientNodeBoundary` Vite plugin
(`@tools/dotfiles/client-node-boundary`, in every React Router app's `vite.config.ts`) is the
gate: it fails the app's client `build` and names each builtin with the module that imported it, so
imports reached through other modules are caught, not just direct ones. CI runs that build for
affected apps through the `check-client-boundary` target. Run it yourself before pushing a change
to a package that browser code imports:

```bash
pnpm nx run openthrottle-developer:check-client-boundary
```

**Report the outcome when that build passes** ([why](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md#reporting-an-outcome-from-a-skill)): `success`; `error` if it still names a
builtin when you stop; `abandoned` if nothing you touched is reachable from browser code.

```bash
r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-client-node-boundary --outcome success; fi
```

The `react-router` application generator adds both the plugin and the empty
`"check-client-boundary": {}` target, so a scaffolded app is covered from the start.

## A package's name tells you nothing

`@openthrottle/nodejs-utils` sounds server-only, but browser code imports it, and that is how this
broke. Adding `expandHome` (one `node:os` import) to that package's barrel reached all eight client
modules that import `isRecord` from it.

**Barrels make it worse.** One `node:*` import anywhere behind a package's `index.ts` reaches every
client module that imports anything from that package.

## The three ways out

```ts
// GOOD — the code belongs on the server. This is how the original break was fixed:
// expandHome moved to applications/openthrottle-server/src/services/paths/.

// GOOD — type-only, erased at compile time.
import type { WorkspaceConfig } from '@openthrottle/openthrottle-ide';

// GOOD — behind a *.server.ts module, which never enters the client bundle.
const { runIdeEngine } = await import('./ide-engine.server.ts');
```

```ts
// BAD — in a package that browser code imports, however indirectly.
import { homedir } from 'node:os';
```

Node-heavy packages (`openthrottle-agentic-utils`, `openthrottle-ide`, `openthrottle-skills`,
`openthrottle-drivers`) are fine as they are, because client code reaches them only through
`*.server.ts` and `import type`. What matters is not which package the code lives in but what a
client module can reach through its imports.
