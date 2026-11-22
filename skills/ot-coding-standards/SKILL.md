---
name: ot-coding-standards
description: >-
  OpenThrottle coding standards that lint and typecheck cannot see. USE WHEN
  importing a node:* builtin (node:os, node:fs, node:path, …) or a Node-only
  package from code a browser bundle could reach; adding to a package barrel
  (index.ts) that React Router apps import; an app build fails with "Node
  builtins reached the client bundle"; or the browser console says a module
  "has been externalized for browser compatibility". Not for folder placement
  (ot-folders) or server conventions (ot-stack).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-21'
  version: '1.0.0'
---

# OpenThrottle coding standards

The root `AGENTS.md` § Code style states the always-on rules. This skill holds the standards that
need more than one line, because breaking them passes lint and typecheck and only shows up later.

## Client/Node boundary

Never let a Node builtin become reachable from browser code.

Vite does not error when a client module's import graph reaches a `node:*` import. It externalizes
the builtin and ships a stub in its place: an empty object in a production build, so the page
breaks with `homedir is not a function` when the code runs; a console warning in the dev server:

```
Module "node:os" has been externalized for browser compatibility.
Cannot access "node:os.homedir" in client code.
```

### What catches it

**`typecheck` and `lint` pass when you break this.** The `clientNodeBoundary` Vite plugin
(`@tools/dotfiles/client-node-boundary`, in every React Router app's `vite.config.ts`) is the
gate: it fails the app's client `build` and names each builtin with the module that imported it, so
imports reached through other modules are caught, not just direct ones. CI runs that build for
affected apps through the `check-client-boundary` target. Run it yourself before pushing a change
to a package that browser code imports:

```bash
pnpm nx run openthrottle-developer:check-client-boundary
```

A new React Router app needs the plugin in its `vite.config.ts` and an empty
`"check-client-boundary": {}` target in its `package.json`.

### A package's name tells you nothing

`@openthrottle/nodejs-utils` sounds server-only, but browser code imports it, and that is how this
broke. Adding `expandHome` (one `node:os` import) to that package's barrel reached all eight client
modules that import `isRecord` from it.

**Barrels make it worse.** One `node:*` import anywhere behind a package's `index.ts` reaches every
client module that imports anything from that package.

### The three ways out

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
