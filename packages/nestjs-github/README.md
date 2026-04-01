# @openthrottle/nestjs-github

NestJS modules for GitHub REST access (issues and pulls) and GraphQL resolvers for pull-request and merge analytics in OpenThrottle applications.

## Build (monorepo)

```bash
pnpm nx run @openthrottle/nestjs-github:build
```

Watch mode: `pnpm nx run @openthrottle/nestjs-github:dev`.

## Installation

**In this monorepo:** add `"@openthrottle/nestjs-github": "workspace:*"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

This package is **private** to the workspace and is not published to the public registry.
