# @openthrottle/graphql-codegen

Centralizes GraphQL Codegen dependencies for the OpenThrottle monorepo (`client` preset and `typescript-validation-schema` plugin). Apps and packages run `graphql-codegen` from their own `codegen.ts` files; this package hoists the shared toolchain version.

## Installation

Workspace packages depend on this package via the root `package.json` or a direct `workspace:^` reference. Do not add individual `@graphql-codegen/*` packages to consumers unless a config needs a plugin outside the shared set.

```bash
pnpm add @openthrottle/graphql-codegen@workspace:^
```

## Usage

Import the config type when authoring `codegen.ts`:

```ts
import type { CodegenConfig } from '@openthrottle/graphql-codegen';
```

Run codegen from a project that defines `codegen.ts`:

```bash
pnpm nx run <project>:codegen-graphql
```
