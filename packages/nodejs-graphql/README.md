# @openthrottle/nodejs-graphql

Fetch-based GraphQL client for React Router loaders and actions against openthrottle-server, using `TypedDocumentNode` from codegen.

## Build (monorepo)

```bash
pnpm nx run @openthrottle/nodejs-graphql:build
```

Watch mode: `pnpm nx run @openthrottle/nodejs-graphql:__dev`.

## Installation

**In this monorepo:** add `"@openthrottle/nodejs-graphql": "workspace:*"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

This package is **private** to the workspace and is not published to the public registry.
